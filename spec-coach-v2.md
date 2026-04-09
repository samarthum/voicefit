# VoiceFit Coach v2 — Spec

Mobile-first, agentic AI coach replacing the existing read-only assistant.

The legacy web coach (`/api/assistant/chat`, `app/api/assistant/`, `lib/assistant/`, web `coach.tsx` if any) is **left untouched**. This document scopes a parallel `/api/coach/*` surface that the mobile app will consume.

---

## 1. Goals

- Answer open-ended questions about diet, training, weight, and progress with the depth and judgment of a real coach who has the full picture of your data.
- Handle cross-domain reasoning by iteratively pulling data via tools — e.g., "compare my last two Mondays and tell me why my reps dropped, considering what I ate".
- Remember durable facts about the user (goal, body stats, dietary style, training experience) — both via a structured profile and via facts learned in conversation.
- Stream tool calls and answer text live so the user can follow the coach's reasoning.

## 2. Non-goals (v1)

- **Write actions** beyond memory: no goal updates, no log proposals, no workout-plan generation. Coach is read + remember only.
- **Web app coach.** Stays on the legacy endpoint and UI. Will be redesigned in a later effort.
- **Memory display in chat UI.** save_fact persists silently in v1; the chip / chat indicator and the review/edit settings page are deferred.
- **Sleep data.** Not tracked yet; defer until added to the app.
- **Inline charts or data tables** in answers.
- **Citations / footnoted references.** Coach writes natural prose without explicit receipts.
- **Multi-thread conversations.** One rolling thread per user.
- **Macro backfill** for existing meals. Macros are populated forward only.
- **Insight cards / proactive feed.** Coach is reactive in v1.

## 3. User stories

1. **Cross-domain debug.** "Look at my last two Monday workouts and tell me what happened. My strength was down — tie it to my diet around that time." Coach pulls workout sets for both Mondays, pulls meals from the surrounding days, compares, writes a reasoned answer.
2. **Adherence check.** "How many weeks have I worked out in the last six? Have I missed any?" Coach calls `workout_consistency(weeks=6)` and answers.
3. **Per-lift progression.** "How is my squat progressing over the last two months?" Coach calls `exercise_progression(exercise_name="squat", weeks=8)` and summarizes the trend.
4. **Weekly check-in.** "Am I on track for my goal this week?" Coach uses profile.goal + `daily_summary` for the current week vs targets.
5. **Open question.** "What should I focus on next week?" Coach pulls recent data, weighs against goal and saved facts, gives a focused recommendation.
6. **Conversational memory (silent in v1).** Over time, the coach quietly captures facts like "user is bulking through April", "user has a cranky left knee", "user prefers PPL splits". These flow into the system prompt of future conversations.

## 4. Architecture

### 4.0 Implementation stack

| Layer | Choice | Notes |
|---|---|---|
| Agent framework | **Vercel AI SDK** (`ai@6.0.154`, already installed in `voicefit/`) | `ToolLoopAgent` pattern from `ai/docs/03-agents`. Provides the multi-step tool loop, streaming, stop conditions, typed tool parts. |
| LLM provider | **Vercel AI Gateway** (`anthropic/claude-sonnet-4.6`) | Default global provider in the AI SDK; model accessed by string. Auth via `AI_GATEWAY_API_KEY` (or automatic Vercel OIDC in production). Open question: do we also migrate the existing `interpret/meal` Claude call to gateway, or only use gateway for the new coach? See §13. |
| Stream protocol | **AI SDK UI message stream** (`toUIMessageStreamResponse()`) | Standard format with typed `tool-{toolName}` parts. No custom SSE protocol needed — the friendly tool labels travel as part of the tool's `inputSchema` (see §4.4). |
| Mobile chat client | **`@ai-sdk/react` `useChat` hook** + `expo/fetch` + polyfills | Per the official Expo quickstart bundled at `ai/docs/02-getting-started/07-expo.mdx`. `useChat` works in React Native; `expo/fetch` is required for streaming consumption; needs `@ungap/structured-clone` and `@stardazed/streams-text-encoding` polyfills. |
| Markdown render | `react-native-markdown-display` | For text parts in assistant bubbles. |

### 4.1 Agent loop

| Decision | Value | AI SDK primitive |
|---|---|---|
| Model | `'anthropic/claude-sonnet-4.6'` | string passed directly to `model:` (gateway is default global provider) |
| Extended thinking | Always on, every turn | `providerOptions: { anthropic: { thinking: { type: 'enabled', budgetTokens: 12000 } } }` |
| Max iterations | 8 tool calls per user turn | `stopWhen: stepCountIs(8)` |
| Streaming | UI message stream over HTTP | `streamText(...).toUIMessageStreamResponse({ headers: ... })` |
| History window | Last 20 message turns sent to model | Server slices the incoming `messages: UIMessage[]` to the last 20 (plus the new user turn) before passing to `streamText` |
| Tool execution | Serial, in-process | `tool({ description, inputSchema, execute })` from `ai`; SDK handles the loop |
| Forced answer on cap hit | Tools dropped when step count reaches cap | Custom `prepareStep` that sets `activeTools: []` when `stepNumber >= 7` so the final step has to write text |

### 4.2 System prompt (sketch)

```
You are VoiceFit Coach — a friendly, supportive, no-fluff fitness and nutrition coach
working with one user. You have a complete picture of their logged data via tools and
remember durable facts about them across conversations.

Today is {date}. The user's local timezone is {timezone}. Weeks start on Monday.

User profile:
- Goal: {goal or "unknown"}
- Body: {height, weight, age, sex or "unknown"}
- Dietary style: {style or "unknown"} (restrictions: {restrictions or "none"})
- Training experience: {experience or "unknown"}
- Daily targets: {calorieGoal} kcal, {stepGoal} steps

What the coach knows about the user (durable facts):
{facts list, grouped by category, or "nothing yet"}

Tools:
- query_meals, query_workout_sessions, query_workout_sets, query_metrics — raw data access
- compare_periods, workout_consistency, exercise_progression, daily_summary — pre-computed analysis
- save_user_fact — record durable facts when you learn something that should persist
  beyond this conversation (goal change, injury, dietary shift, strong preference)

Rules:
- You are read-only. You cannot log meals/workouts or change goals — direct the user to
  the relevant tab if they want to take action.
- Never invent data. If a tool returns nothing for a period, say so.
- Be transparent about gaps ("I don't have sleep data yet", "you haven't logged meals on
  Mar 28 so I can't compare").
- No medical or clinical advice. Soft-redirect to a real professional for anything that
  smells medical (injury diagnosis, supplements that interact with medication, eating
  disorders, etc.).
- Use save_user_fact when you learn something durable. Don't save ephemeral things
  ("I'm tired today") or things already in the profile.
- Keep replies focused. Answer the question, then offer one natural follow-up if useful.
  Use markdown (bold, bullet lists, short subheaders) when it aids readability.
- Tone: warm, encouraging, honest. No toxic positivity. Like a coach who's been doing
  this for years.
```

### 4.3 Streaming protocol

We use the **AI SDK's UI message stream** as-is — no custom SSE protocol on top.

`POST /api/coach/chat` accepts `{ messages: UIMessage[] }` (the standard `useChat` request body) and returns `result.toUIMessageStreamResponse({ headers: { 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'none' } })` (the Expo-required headers per the bundled quickstart).

The mobile client consumes the response via `useChat` from `@ai-sdk/react`. Each assistant message arrives as an array of typed `parts`:

| Part type | Rendered as |
|---|---|
| `text` | Streaming markdown into the assistant bubble |
| `tool-query_meals`, `tool-query_workout_sets`, `tool-compare_periods`, `tool-workout_consistency`, `tool-exercise_progression`, `tool-daily_summary`, `tool-query_workout_sessions`, `tool-query_metrics`, `tool-save_user_fact` | An activity line above the assistant text. Reads `part.input.label` for the friendly text and `part.state` (`input-streaming` / `input-available` / `output-available`) for the spinner / running / done indicator. The actual tool output is not rendered (it's only useful to the model). |

Tool parts pass through three states (`input-streaming` → `input-available` → `output-available`) which the UI maps to spinner → running → checkmark.

### 4.4 Friendly tool labels

Every tool's `inputSchema` includes a required `label: z.string().describe(...)` field as its first property. The model is instructed in the system prompt to fill this field with a one-line user-facing description of what it's about to do (e.g., `label: "Pulling your squat sets from the last 8 weeks"`).

Because the AI SDK streams tool parts to the client with `part.input` visible during the `input-streaming` and `input-available` states, the label is automatically streamed to the mobile UI as part of the standard typed tool part — **no custom protocol or backend translation is needed**. The executors ignore the `label` field; it's purely for streaming UX.

If the model ever omits the label (it shouldn't, given the strong system-prompt instruction and the schema marking it required), the client falls back to a templated label ("Looking up workout sets…") derived from the tool name.

## 5. Tools

All tools are defined via `tool({ description, inputSchema, execute })` from the `ai` package and exported as a single `coachTools` object from `voicefit/lib/coach/tools.ts`. Every `inputSchema` has `label: z.string().describe("One-line user-facing description of what this query is for")` as its first field. Executors ignore `label`.

Date fields are ISO date strings (`YYYY-MM-DD`) interpreted in the user's local timezone (passed in via the system prompt). Backend converts to UTC `Date` objects for Prisma queries. Week boundaries use Monday start.

### 5.1 Domain query tools

**`query_meals`** — Filterable raw meal access
- Input: `{ label, start_date, end_date, meal_type?, limit? }`
- `meal_type`: `breakfast | lunch | dinner | snack` (optional)
- `limit`: default 50, max 200
- Returns: `[{ id, eatenAt, mealType, description, calories, proteinG?, carbsG?, fatG? }]`

**`query_workout_sessions`** — Workout session list with summary
- Input: `{ label, start_date, end_date, limit? }`
- Returns: `[{ id, startedAt, endedAt, title, exerciseNotes, setCount, exercises: string[] }]`
- `exercises` is the deduped list of exercise names performed in the session

**`query_workout_sets`** — Individual sets, the heart of progression analysis
- Input: `{ label, start_date, end_date, exercise_name?, session_id?, limit? }`
- `exercise_name`: fuzzy-matched against the canonical list in `lib/exercises.ts` (so "squat", "back squat", "squats" all resolve to the same canonical lift)
- Returns: `[{ id, sessionId, performedAt, exerciseName, exerciseType, reps?, weightKg?, durationMinutes? }]`
- Default limit 200, max 500

**`query_metrics`** — Daily steps and weight
- Input: `{ label, start_date, end_date }`
- Returns: `[{ date, steps?, weightKg? }]`

### 5.2 Analysis helpers

**`compare_periods`** — Two-window comparison
- Input: `{ label, metric, range_a: { start, end }, range_b: { start, end } }`
- `metric`: `calories | protein | steps | weight_avg | workout_count | training_volume_kg`
- Returns: `{ a: number, b: number, delta: number, percent_change: number, notes?: string }`
- `notes` flags caveats like "range_b has 2 days with no meal logs"

**`workout_consistency`** — Adherence and streaks
- Input: `{ label, weeks }` (1–26)
- Returns: `{ weeks_with_workouts, total_weeks, current_streak, longest_streak, weekly_breakdown: [{ week_start, count }] }`
- Week-start = Monday in user TZ

**`exercise_progression`** — Per-lift trend
- Input: `{ label, exercise_name, weeks }`
- Fuzzy-matches `exercise_name`
- Returns: `{ exercise_name_canonical, weeks: [{ week_start, top_set_weight_kg, top_set_reps, total_reps, total_volume_kg, sessions }] }`
- Empty weeks (no workouts) are included with zeros so the model can see gaps

**`daily_summary`** — Per-day rollup
- Input: `{ label, start_date, end_date? }` (end_date defaults to start_date)
- Returns per-day: `{ date, calories, proteinG?, carbsG?, fatG?, steps?, weightKg?, workouts_done, workout_volume_kg }`
- Saves the model from making 4 separate queries to assemble a daily snapshot

### 5.3 Memory

**`save_user_fact`** — Durable memory write (silent in v1)
- Input: `{ label, category, fact, confidence? }`
- `category`: `goal | dietary | injury | preference | training_history | other`
- `fact`: short natural-language statement, e.g., "user is bulking through April; targeting 80kg"
- `confidence`: optional `0..1`, defaults to 1
- Side effect: insert into `UserFact` table
- Returns: `{ ok: true, factId }`
- **No UI surfacing in v1.** The chat shows nothing. The fact appears in the system prompt of all future conversations.

## 6. Schema changes

### 6.1 Modify `MealLog`

```prisma
model MealLog {
  // existing fields...
  proteinG  Float?
  carbsG    Float?
  fatG      Float?
}
```

- Update `/api/interpret/meal` Claude prompt to extract macros (it already understands the food well enough — protein/carbs/fat estimates are routine for this tier of model).
- Existing meals stay null; tools report `null` macros for those rows; coach handles gracefully.

### 6.2 New tables

```prisma
model CoachProfile {
  id                  String   @id @default(cuid())
  userId              String   @unique
  goal                String?  // 'lose' | 'gain' | 'recomp' | 'maintain'
  heightCm            Float?
  weightKg            Float?   // current snapshot, separate from DailyMetric trend
  age                 Int?
  biologicalSex       String?  // 'male' | 'female' | 'other'
  dietaryStyle        String?  // 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'other'
  dietaryRestrictions String?  // free text (allergies)
  trainingExperience  String?  // 'beginner' | 'intermediate' | 'advanced'
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  user                AppUser  @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model CoachMessage {
  id        String   @id @default(cuid())
  userId    String
  role      String   // 'user' | 'assistant'
  content   String   @db.Text
  toolCalls Json?    // assistant turns: [{ name, label, input, output_summary }]
  createdAt DateTime @default(now())
  user      AppUser  @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, createdAt])
}

model UserFact {
  id        String   @id @default(cuid())
  userId    String
  category  String   // 'goal' | 'dietary' | 'injury' | 'preference' | 'training_history' | 'other'
  fact      String   @db.Text
  source    String   @default("coach_save_fact")
  createdAt DateTime @default(now())
  user      AppUser  @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, category])
}
```

### 6.3 `AppUser` relation additions

```prisma
model AppUser {
  // existing...
  coachProfile  CoachProfile?
  coachMessages CoachMessage[]
  coachFacts    UserFact[]
}
```

`CoachMessage` is a single rolling thread per user (no `threadId` column; v1 has one thread per user). `clear conversation` deletes all rows for that user.

`UserFact` is **never** deleted on `clear conversation` — facts persist independently of chat history.

## 7. Backend endpoints

All under `voicefit/app/api/coach/`. All require `getCurrentUser()`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/coach/chat` | Streaming UI message stream. Body: `{ messages: UIMessage[], timezone?: string }` (the standard `useChat` request body shape, with `timezone` added) |
| GET | `/api/coach/messages` | Returns the persisted thread as `{ messages: UIMessage[] }` for `useChat`'s `initialMessages` on mount |
| POST | `/api/coach/clear` | Delete all `CoachMessage` rows for the user. Facts preserved. |
| GET | `/api/coach/profile` | Returns `CoachProfile` row or `null` |
| PUT | `/api/coach/profile` | Upsert `CoachProfile`. Validated by Zod. |

### 7.1 `POST /api/coach/chat` flow

```ts
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { coachTools } from '@/lib/coach/tools';
import { buildSystemPrompt } from '@/lib/coach/system-prompt';

export async function POST(req: Request) {
  const { userId } = await getCurrentUser();
  const { messages, timezone } = (await req.json()) as { messages: UIMessage[]; timezone?: string };

  const [profile, facts] = await Promise.all([
    prisma.coachProfile.findUnique({ where: { userId } }),
    prisma.userFact.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
  ]);

  // Sliding window: take the last 20 turns of incoming history (useChat sends the full thread)
  const windowed = messages.slice(-20);

  const result = streamText({
    model: 'anthropic/claude-sonnet-4.6',
    system: buildSystemPrompt({ profile, facts, timezone, today: new Date() }),
    messages: convertToModelMessages(windowed),
    tools: coachTools(userId),
    stopWhen: stepCountIs(8),
    providerOptions: {
      anthropic: { thinking: { type: 'enabled', budgetTokens: 12000 } },
    },
    prepareStep: async ({ stepNumber }) => {
      // Force a final-text answer if we've reached the cap.
      if (stepNumber >= 7) return { activeTools: [] };
      return {};
    },
    onFinish: async ({ response }) => {
      // Persist the new user turn (last item in incoming messages) and the assistant turn.
      await persistTurn({ userId, userTurn: messages.at(-1)!, assistantResponse: response });
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}
```

The above is the canonical shape — `lib/coach/agent.ts` may extract pieces (e.g., `runCoach()`) but the route handler stays close to this. `coachTools(userId)` is a factory that closes over `userId` so each tool's executor can scope its Prisma queries to the current user without trusting tool inputs.

The 8-step cap is enforced by `stopWhen: stepCountIs(8)`. The `prepareStep` hook drops tools at step 7 so the model is forced to write final text rather than queue more tool calls right at the boundary.

## 8. Mobile UI — `voicefit-mobile/app/(tabs)/coach.tsx`

**Throw out the existing file. Rewrite from scratch.**

### 8.1 Layout

```
Screen root (no SafeAreaView wrapper — use contentInsetAdjustmentBehavior on the list)
├── Header (sticky top)
│   ├── Title "Coach"
│   └── DropdownMenu (zeego, right)
│       ├── Edit profile          → opens profile form modal
│       └── Clear conversation    → confirm → POST /api/coach/clear
│
├── LegendList or FlashList (inverted, takes flex 1)
│   ├── contentInsetAdjustmentBehavior="automatic"  (native safe-area handling)
│   ├── keyboardDismissMode="on-drag"
│   ├── Empty state ListEmptyComponent:
│   │   ├── Greeting: "Ask me anything about your training, food, or progress."
│   │   └── 4 starter chips (Pressable each) — tap sends the text via sendMessage
│   │
│   └── Messages (alternating bubbles, inverted):
│       ├── UserBubble — right-aligned, dark (memoized)
│       └── AssistantBubble — left-aligned (memoized)
│           ├── ToolActivityLine[] — one per tool-* part
│           │   • label from part.input.label
│           │   • state icon from part.state: spinner / running / checkmark
│           └── Markdown body from text parts
│
└── Composer (sticky bottom, KeyboardAvoidingView)
    ├── TextInput (multiline, autogrowing)
    ├── Mic button — Pressable → record → POST /api/transcribe → fill input
    └── Send button — Pressable → sendMessage({ text: input })
```

**Rendering rules (per `vercel-react-native-skills`):**
- **CRITICAL — list virtualization.** The message list uses a virtualized list (`@legendapp/list` `LegendList` or `@shopify/flash-list` `FlashList`), NOT `FlatList` or `ScrollView`. Inverted mode for chat.
- **CRITICAL — no falsy `&&`.** Use ternaries with `null` (or `!!value`) for conditional rendering of tool parts, empty state, error bubbles. Enable `react/jsx-no-leaked-render` ESLint rule to catch automatically.
- **Memoize bubble components.** `UserBubble` and `AssistantBubble` wrapped in `React.memo`. Pass primitives where possible (message id, role, parts). Avoid inline objects / inline functions in `renderItem`.
- **Stable callbacks.** Any handler passed to bubble components is `useCallback`-wrapped at the list root (or handled by React Compiler if enabled in the Expo project).
- **Safe area.** Use `contentInsetAdjustmentBehavior="automatic"` on the list instead of wrapping in `SafeAreaView` — lets iOS handle safe area insets natively with proper scroll-behind-statusbar behavior.
- **Pressable only.** No `TouchableOpacity` / `TouchableHighlight` anywhere. Use `Pressable` for all taps. For starter chips and composer buttons inside the scrollable list, prefer `Pressable` from `react-native-gesture-handler` if we're using its ScrollView.

### 8.2 First-visit profile form

On mount, if `GET /api/coach/profile` returns `null`, open a **native `<Modal presentationStyle="formSheet">`** (not a JS-based bottom sheet library) containing:
- Goal (segmented: lose / gain / recomp / maintain)
- Height (cm), Weight (kg) — number inputs
- Age, biological sex
- Dietary style + free-text restrictions
- Training experience (segmented: beginner / intermediate / advanced)
- Save and Skip buttons (both dismiss)

Native form-sheet modal gives us swipe-to-dismiss, proper keyboard avoidance, and accessibility out of the box. If the user dismisses without saving, no further nag — they can fill it later from the header menu ("Edit profile") or from the Settings tab.

### 8.3 Streaming consumption — `useChat` from `@ai-sdk/react`

Per the bundled Expo quickstart at `voicefit/node_modules/ai/docs/02-getting-started/07-expo.mdx`:

```tsx
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';

const { messages, sendMessage, status, error } = useChat<CoachUIMessage>({
  transport: new DefaultChatTransport({
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    api: `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/coach/chat`,
    headers: async () => ({ Authorization: `Bearer ${await getToken()}` }),
    body: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  }),
  // Hydrate from server-persisted history on mount
  messages: initialMessagesFromServer,
});
```

- Initial messages come from `GET /api/coach/messages` (server-persisted thread, fetched once on mount via React Query). They are passed to `useChat` as the initial state.
- `sendMessage({ text })` POSTs the full client-side messages array to `/api/coach/chat` (this is `useChat`'s default behavior).
- The streamed response is automatically merged into `messages` as it arrives, with typed `tool-{toolName}` parts surfaced through their state machine (`input-streaming` → `input-available` → `output-available`).
- We render `m.parts` with a switch over `text` and the nine `tool-*` types. Tool parts read `part.input.label` for the friendly text and `part.state` for spinner / running / checkmark.
- On the server, `streamText`'s `onFinish` callback persists both the new user turn and the completed assistant turn (with all tool calls preserved in the message JSON). The mobile client doesn't need to do anything to persist.

### 8.3.1 Polyfills (required for Expo / React Native)

Per the bundled docs, AI SDK streaming on Expo requires:
- `@ungap/structured-clone`
- `@stardazed/streams-text-encoding`

Polyfilled into globals via a `polyfills.ts` file imported at the top of `voicefit-mobile/app/_layout.tsx`. Sample provided in the bundled docs.

### 8.4 Markdown rendering

Add `react-native-markdown-display`. Style to match the rest of the app:
- Body: SF Pro / system, 16pt, gray-900
- Bold: gray-900, weight 600
- Bullets: native disc, 14pt
- Subheaders: 17pt, weight 600

### 8.5 State management

- `useChat` from `@ai-sdk/react` owns the messages array and the streaming state.
- React Query for the **initial** `GET /api/coach/messages` fetch (one-shot, used to hydrate `useChat`).
- React Query mutation for `POST /api/coach/clear` (on success, reset `useChat` via `setMessages([])`).
- React Query for `GET/PUT /api/coach/profile`.
- **No more module-level `cachedMessages`** — all persistence is server-side, all live state is in `useChat`.

### 8.5.1 Type-safe tool parts

Following the AI SDK's `InferAgentUIMessage` pattern documented at `ai/docs/03-agents/02-building-agents.mdx`:

```ts
// voicefit/lib/coach/types.ts (also re-exported from @voicefit/contracts)
import type { UIMessage } from 'ai';
import type { coachTools } from './tools';

export type CoachUIMessage = UIMessage<unknown, never, /* tool inputs/outputs */ ...>;
```

The exact type construction is verified against the bundled `references/type-safe-agents.md` skill doc during M2. The mobile client imports `CoachUIMessage` and uses it as the `useChat` generic so `m.parts` is typed end-to-end.

### 8.6 Settings tab addition

New section "Coach profile" in `voicefit-mobile/app/(tabs)/settings.tsx` rendering the same form as the first-visit sheet.

## 9. Error handling

| Failure | Behavior |
|---|---|
| Tool executor throws / returns `{ error }` | The AI SDK feeds the error back to the model as a tool result; model writes a graceful response. UI shows the tool part in `output-available` state with a small "couldn't fetch" hint derived from the error payload. |
| Empty data for a range | Tool returns `[]`; model is instructed to acknowledge gaps explicitly. |
| Stream errors mid-response | `useChat`'s `error` state is set; the mobile UI shows a red error bubble with a Retry control. The `onFinish` server callback won't fire, so the partial assistant turn is not persisted (clean retry semantics). |
| Iteration cap hit (step 7+) | `prepareStep` drops tools so the model is forced to write a final-text answer with whatever it has. |
| Auth failure | 401 from `/api/coach/chat` → mobile redirects to sign-in. |
| Network failure on mobile | `useChat` `error` state → local retry button. |

## 10. Cost & performance budget

| Metric | Target |
|---|---|
| Per-turn cost | ~$0.05–$0.20 (extended thinking on, ~3–6 tool calls typical) |
| First `tool_use` event | < 3s after request |
| First `text_delta` | < 8s for typical 3-tool queries |
| End-to-end p50 | 8–15s |
| End-to-end p95 | 25–30s (cap-bound) |

If real-world cost is too high, the obvious lever is **flipping extended thinking off by default** (it was an explicit opt-in to "always on" — easy to dial back).

## 11. What to delete vs. keep

### Keep untouched
- `voicefit/app/api/assistant/chat/route.ts` (legacy web endpoint)
- `voicefit/lib/assistant/*` (legacy backend code)
- `voicefit/spec-chat-assistant.md` (historical record)
- The web app coach UI (if any)

### Delete and replace
- `voicefit-mobile/app/(tabs)/coach.tsx` — full rewrite
- The module-level `cachedMessages` cache — replaced by server persistence

### Add
- All files under `voicefit/app/api/coach/` (`chat`, `messages`, `clear`, `profile`)
- `voicefit/lib/coach/{tools,system-prompt,types}.ts` (and `agent.ts` if we extract `runCoach()` from the route handler)
- Prisma migration for macros + 3 new tables
- Settings tab "Coach profile" section (mobile)

### Dependencies to add
- **Backend (`voicefit/`):** `ai@^6` (already installed). May add `@ai-sdk/anthropic` only if we discover we need provider-direct features beyond what the gateway exposes — start without it.
- **Mobile (`voicefit-mobile/`):**
  - `ai`, `@ai-sdk/react`, `zod` — AI SDK client
  - `react-native-markdown-display` — markdown rendering
  - `@ungap/structured-clone`, `@stardazed/streams-text-encoding` — polyfills required by the Expo quickstart
  - `@legendapp/list` (or `@shopify/flash-list`) — virtualized message list (per `list-performance-virtualize` rule)
  - `zeego` — native dropdown menu for the header (per `ui-menus` rule)
  - Polyfills imported once at the top of `app/_layout.tsx`.
  - Native deps (zeego, flash-list/legend-list if they bring native code) must be installed directly in `voicefit-mobile/package.json`, not only in a shared package, for autolinking to pick them up.
- **Env vars:** `AI_GATEWAY_API_KEY` in `voicefit/.env.local` for local dev (production on Vercel uses OIDC automatically). The existing `ANTHROPIC_API_KEY` stays put for `/api/interpret/meal` (coach-only gateway migration).

## 12. Implementation milestones

### M1 — Backend agent + tools (no UI) ✅ COMPLETE

**Status:** Done (2026-04-09). All files shipped, typechecks pass, smoke test passed.

**What was built:**
- Prisma migration `20260408120000_add_coach_tables_and_meal_macros`: macro columns on MealLog + CoachProfile + CoachMessage + UserFact tables. Applied to Neon.
- `@voicefit/contracts@0.0.3`: added `proteinG/carbsG/fatG` to `mealInterpretationSchema`, `createMealSchema`, `updateMealSchema`, and `MealInterpretation` type. Vendored into both consumers.
- `/api/interpret/meal` prompt updated to extract macros alongside calories.
- `/api/meals` POST and PUT updated to persist macros.
- `lib/coach/tools.ts` — `coachTools(userId)` factory with 9 tools: `query_meals`, `query_workout_sessions`, `query_workout_sets`, `query_metrics`, `compare_periods`, `workout_consistency`, `exercise_progression`, `daily_summary`, `save_user_fact`. Each uses `tool({ description, inputSchema, execute })` from `ai` with `label: z.string()` as the first field. Uses `lib/exercises.ts` for fuzzy exercise matching.
- `lib/coach/system-prompt.ts` — `buildSystemPrompt({ profile, facts, timezone, today, calorieGoal, stepGoal })`
- `lib/coach/persistence.ts` — `persistTurn()` (writes user + assistant CoachMessage rows from `onFinish`) and `loadHistory()` (loads last N messages for context window)
- `app/api/coach/chat/route.ts` — `streamText` with `'anthropic/claude-sonnet-4.6'`, extended thinking always on (`budgetTokens: 12000`), `stopWhen: stepCountIs(8)`, `prepareStep` drops tools at step 7, `onFinish` persists turns, returns `toUIMessageStreamResponse` with Expo headers
- `app/api/coach/messages/route.ts` — GET returns persisted thread
- `app/api/coach/clear/route.ts` — POST deletes all CoachMessage rows (facts preserved)
- `app/api/coach/profile/route.ts` — GET/PUT with Zod validation
- `AI_GATEWAY_API_KEY` set in `.env.local` for local dev

**Smoke test result:** "How am I doing this week?" → model used extended thinking, called `daily_summary` + `workout_consistency` with friendly labels, returned structured markdown answer referencing real data (3 workouts, step counts, flagged no meal logs). ~25s end-to-end. Tool calls streamed correctly with `tool-input-start` / `tool-input-delta` / `tool-input-available` / `tool-output-available` events.

**Known gaps for M2 to address:**
- `lib/coach/types.ts` (CoachUIMessage) was not created — the exact type construction should be verified against the AI SDK's `InferAgentUIMessage` pattern during M2 when the mobile client consumes the stream.
- Macros won't appear in the DB until the mobile app passes them through from interpretation → createMeal POST (mobile-side change in M2).
- The `convertToModelMessages` call in the chat route receives UIMessage[] from the client; the first time (before any messages exist), the client sends its own initial message. The `loadHistory()` helper exists but isn't used in the current chat route because useChat sends the full message array — this is the standard AI SDK pattern. History hydration happens via `GET /api/coach/messages` → `useChat`'s `initialMessages` on the mobile side.

### M2 — Mobile chat UI rewrite + profile
- Install deps in `voicefit-mobile/`: `ai @ai-sdk/react zod react-native-markdown-display @ungap/structured-clone @stardazed/streams-text-encoding @legendapp/list zeego`
- Enable the `react/jsx-no-leaked-render` ESLint rule to catch `&&` falsy-crash bugs before they ship
- Add `polyfills.ts` and import at the top of `app/_layout.tsx` (per Expo quickstart)
- Spike: verify `expo/fetch` works with Clerk Bearer auth header injection. Fallback is to wrap `expoFetch` in the `transport`'s custom `fetch` with auth header logic.
- Throw out `voicefit-mobile/app/(tabs)/coach.tsx`, rewrite from scratch using the rules in §8.1:
  - `useChat<CoachUIMessage>` with `DefaultChatTransport`
  - Initial messages hydrated from `GET /api/coach/messages` via React Query → passed to `useChat`'s initial state
  - Virtualized inverted list (`LegendList`/`FlashList`), not `FlatList`
  - `contentInsetAdjustmentBehavior="automatic"` instead of `SafeAreaView`
  - `UserBubble` and `AssistantBubble` memoized, primitives-only props, stable callbacks
  - Ternary-with-null (never `&&`) for conditional rendering
  - Render `m.parts` switch over `text` and the nine `tool-*` types; tool parts read `part.input.label` + `part.state`
  - `text` parts render via `react-native-markdown-display`
  - Header menu via **zeego** `DropdownMenu` (Edit profile, Clear conversation)
  - 4 starter prompt chips in `ListEmptyComponent` (Pressable each)
  - Composer with mic + send (`Pressable`, not `TouchableOpacity`); mic uses existing `/api/transcribe`
- First-visit profile form as a **native `<Modal presentationStyle="formSheet">`** (driven by `GET /api/coach/profile` returning null)
- Settings tab "Coach profile" section reusing the profile form
- **Acceptance:** full mobile demo of the cross-domain example with live streaming activity lines and markdown answer; thread survives app reload; list scroll is smooth with 100+ messages

### M3 — Memory (`save_user_fact`)
- Add tool definition + executor in `lib/coach/tools.ts`
- Add memory section to system prompt builder
- Update prompt instructions to call save_user_fact when learning durable facts
- No UI changes — silent persistence
- **Acceptance:** a multi-turn conversation produces UserFact rows; subsequent fresh conversations include those facts in the system prompt and the coach references them naturally

## 13. Open / future work

- Memory display in chat (chip under the assistant message that triggered the save)
- "What the coach knows about me" review/edit settings page
- Web app coach redesign (point web UI at `/api/coach/chat`)
- Sleep data integration when added to the app
- Inline charts for progression questions
- Citations (footnoted references) if user trust becomes an issue
- Goal-update tool, log-proposal tool (action ceiling expansion)
- Multi-thread conversations
- Macro backfill for old meals (optional; cost vs. value tradeoff)
- Per-user rate limiting / cost ceilings
- Insight feed / proactive coach observations

### Decision still needed before M1
- **AI Gateway scope.** The new coach uses the gateway for `anthropic/claude-sonnet-4.6`. The existing `/api/interpret/meal` endpoint uses `@anthropic-ai/sdk` directly with `ANTHROPIC_API_KEY`. Two options:
  1. **Coach-only gateway (recommended for M1):** Add `AI_GATEWAY_API_KEY` for the coach. Leave `interpret/meal` on direct Anthropic. Two providers coexist; least scope creep.
  2. **Migrate everything to gateway:** Refactor `interpret/meal` to use the AI SDK + gateway too, and drop the direct `@anthropic-ai/sdk` dependency. Cleaner long-term, more scope.
