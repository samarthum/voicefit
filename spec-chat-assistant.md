## Conversational Health Coach (Read-only v0.1)

### 1) Goal

Add an in-app conversational assistant that answers questions about a user’s logged health data. v0.1 is **read-only** and does not modify data. This removes the repeated “copy/paste data into ChatGPT” loop and keeps analysis inside VoiceFit.

### 2) Non-Goals (v0.1)

- Any write actions (create/edit/delete logs or goals)
- Medical diagnosis, clinical guidance, or treatment recommendations
- Social/community chat features
- Persisted preferences across sessions
- Desktop-first UX or latency optimization

### 3) Product Principles

- **Read-only by default:** all write intents are deferred to v0.2
- **Coach tone, light touch:** supportive and concise, not motivational fluff
- **Data-driven:** cite date ranges and what data was used
- **Transparent AI:** clearly label the assistant and its limitations
- **Ephemeral chat:** no cross-session history
- **Summaries include absolutes + deltas:** totals plus change vs previous period

### 4) User Jobs

- “Summarize my week” (calories, workouts, steps, weight)
- “Am I on track with my goal?”
- “What changed in my weight trend?”
- “How consistent were my workouts?”
- “What should I focus on next week?” (behavioral summary, not medical advice)

### 5) Research Summary (External)

Competitor patterns worth copying:
- Strava’s Athlete Intelligence provides activity summaries, a “Say More” expansion, in‑product feedback, opt‑out controls, and limits the feature to certain activities; it’s currently mobile-only and private to the account owner. (Strava Support)
- Fitbit’s Gemini-based health coach is rolling out as a U.S. public preview for Premium users with opt‑in onboarding; it collects preferences and uses device data to personalize guidance. (The Verge / TechCrunch)
- Noom’s Welli explicitly limits scope (no medical or highly personalized health questions) and escalates to human coaches when needed. (Noom FAQ)

UX guidelines to align with:
- Chat UI should distinguish participants with clear alignment and identity cues and disclose AI participation. (Visa Product Design System)
- AI systems should set expectations, support efficient correction/dismissal, explain why they responded as they did, and encourage granular feedback. (Microsoft Research Human‑AI Interaction)
- Prompt starters reduce blank‑page anxiety and help users get value quickly. (Microsoft Teams prompt suggestions)
- UI copy should be clear, accurate, and concise. (Material Design Writing)
- Full‑screen dialogs are appropriate on mobile for complex tasks and dense content. (Material Design Dialogs)

### 6) Experience Overview

Entry points:
- Command Center text box (primary)
- Optional “Ask Coach” button on Dashboard

Behavior:
- On mobile: focusing the Command Center opens a **full‑screen sheet**
- On desktop: use a right‑side drawer (secondary, not optimized in v0.1)
- The first message is classified as **question** or **write‑intent**
  - Question → answer with analysis
  - Write‑intent → lightweight deflection + CTA to the appropriate logging flow (no prominent read‑only banner)

### 7) Core Flows

A) Ask a question
1. User: “How was my calorie balance last week?”
2. Assistant calls data tools (meals, goals, daily metrics)
3. Assistant replies with a concise summary, a “data used” note, and 2–3 follow‑up prompts

B) Attempted log
1. User: “Log 8,200 steps for today”
2. Assistant responds with a read‑only notice and a CTA to the existing steps logging flow

C) Mixed intent
- User: “I ran 5k and ate sushi for dinner. How does that affect my deficit?”
- Assistant replies with the analysis and a CTA to log the run and meal separately

### 8) Assistant Capabilities (Intent Catalog)

Read-only intents:
- SummaryToday, SummaryWeek, SummaryRange
- TrendWeight, TrendCalories, TrendSteps
- WorkoutProgress, WorkoutPRs, Consistency
- GoalProgress (calorie/steps)
- ComparisonToPreviousPeriod

Deferred to v0.2 (write intents):
- LogMeal, EditMeal, DeleteMeal
- LogWorkoutSession, LogWorkoutSet, EditWorkoutSet
- LogSteps, LogWeight
- SetCalorieGoal, SetStepGoal

### 9) Tooling Design (v0.1)

Data tools:
- `get_user_profile()` → timezone, units, goals
- `get_daily_metrics(date_range)` → steps, weight
- `get_meals(date_range)` → items, calories
- `get_workouts(date_range)` → sessions, sets, exercises

Computation tools (server-side):
- `calc_calorie_balance(date_range)`
- `calc_weight_trend(date_range, method)`
- `calc_workout_volume(date_range)`
- `calc_consistency(metric, date_range)`
- `calc_goal_progress(metric, date_range)`

Response schema (Structured Outputs):
- `answer` (string, user-facing)
- `data_used` (date range + sources)
- `insights` (optional list)
- `summary` (absolute numbers + deltas vs previous period)
- `follow_ups` (max 3 prompt suggestions)
- `read_only_notice` (optional string when user requests a write action)

### 10) Model + Orchestration (Latest API Patterns)

- Use GPT‑5.2 for assistant responses.
- Use OpenAI tool calling with **Structured Outputs** to guarantee schema‑compliant tool arguments (`strict: true` in tool definitions).
- For direct responses, use `response_format` with `json_schema` and `strict: true` to guarantee schema‑compliant output.
- Disable parallel tool calls for strict schema adherence when needed.
- Use JSON mode only with explicit “JSON” instructions in the system prompt.
- Set `store: false` on Responses API calls (no OpenAI-side persistence).

### 11) Trust, Safety, and Privacy

- Label the assistant as AI and describe limitations
- Disallow medical/clinical advice; respond with a safe deflection
- Provide a “Data used” summary (dates + data sources)
- Feedback controls per response (helpful / not helpful)
- Opt‑out toggle in settings (future, but reserve UI space)

### 12) UI/UX Requirements

- Full‑screen sheet on mobile with clear dismiss
- Left/right message alignment with distinct participant labels
- Sticky message composer with prompt starters
- “Data used” pill in responses
- Inline loading and error states
- Feedback affordances on each assistant message
- No persistent chat history across sessions (new session on each open)

### 13) Analytics & Success Metrics

- Activation rate: % users who open chat
- Engagement: median messages per session
- Intent success: % responses with positive feedback or no follow‑up correction
- Read‑only deflection rate: % write‑intent requests that lead to a logging CTA
- Retention impact: 7‑day and 30‑day retention of chat users

### 14) Rollout Plan

- Feature flag in web app
- Internal dogfood → small beta cohort → full rollout
- Weekly review of failed intents and tool errors

---

## Full Implementation Plan (v0.1 Read‑Only)

### Phase 0: Product & UX

- Finalize intent list, prompt starters, and response tone examples
- Define copy for read‑only notices and logging CTAs
- Produce mobile full‑screen sheet UX spec
- Define success metrics and feedback rubric

### Phase 1: Data & Backend Foundations

- Create read‑only “assistant context” service that can fetch:
  - Daily metrics by range
  - Meals by range
  - Workouts by range
  - User goals and timezone
- Add computation helpers for calories, trends, and consistency
- Add a lightweight caching layer for repeated queries (e.g., last 7 days)

Suggested API contracts:
- `POST /api/assistant/chat`
  - Input: `{ sessionId?, message, clientContext }`
  - Output: structured response schema with `answer`, `data_used`, `follow_ups`
- `POST /api/assistant/feedback`
  - Input: `{ messageId, rating, reason? }`

Suggested data model (if persistence is needed):
- `AssistantSession`: userId, createdAt, lastMessageAt
- `AssistantMessage`: sessionId, role, content, dataUsed, createdAt
- `AssistantFeedback`: messageId, rating, reason

### Phase 2: LLM Orchestration

- Implement an “assistant orchestrator” that:
  - Classifies intents (read‑only vs write‑intent)
  - Calls tools only for read‑only intents
  - Returns a read‑only notice for write‑intent requests
- System prompt requirements:
  - Capabilities and limits
  - No medical advice
  - Always include “data used” summary
  - Coach tone: supportive, concise
- Use Structured Outputs for all model responses and tool calls

### Phase 3: Frontend Experience

- Build a `ChatSheet` component with:
  - Full‑screen layout on mobile
  - Message list and composer
  - Prompt starters on empty state
  - Feedback buttons on assistant responses
- Integrate with the existing Command Center input:
  - Focus opens the sheet
  - Send from Command Center routes into assistant chat
- Provide CTAs to existing logging flows when write intents are detected

### Phase 4: Observability & QA

- Log tool usage, latency, and model errors
- Create QA scripts for:
  - No data scenarios
  - Partial data (missing meals or workouts)
  - Timezone boundary days
  - Write‑intent deflection accuracy
- Add red‑team prompts for medical advice deflections

### Phase 5: Rollout & Iteration

- Feature‑flagged beta with internal users
- Track feedback ratio and deflection rate
- Weekly triage of top failed intents and confusion points

---

## Open Questions (Updated)

- Should chat live only in the full‑screen sheet or also have a dedicated page?
- Do we want the assistant to have access to weekly trend data from `/api/dashboard` or recompute via new helpers?

---

## Concrete Task List (Based on Current Codebase)

### A) UX + UI (mobile-first full-screen sheet)
1. Add a new `ChatSheet` component (full‑screen on mobile, drawer on desktop) that holds:
   - message list
   - composer
   - prompt starters
   - subtle read‑only CTA for write intents
   Files: `components/chat-sheet.tsx`, `components/chat-message.tsx`, `components/chat-composer.tsx`
2. Add a `ChatSheet` trigger to the Command Center:
   - Focusing the Command Center input opens the sheet
   - Keep existing quick‑log buttons as CTAs inside the sheet (navigate to `/meals`, `/workouts/new`, `/metrics`)
   Files: `components/conversation-input.tsx`, `app/dashboard/page.tsx`
3. Add ephemeral chat state (client-only), no persistence:
   - Store messages in component state (or a lightweight hook)
   File: `hooks/use-chat-session.ts` (new) or local state in `ChatSheet`
4. Add “Data used” and “Summary + Delta” blocks to assistant messages
   - Provide clear labels for date ranges and comparison windows
   File: `components/chat-message.tsx`

### B) Assistant API (read-only)
5. Add a new read‑only assistant endpoint:
   - `POST /api/assistant/chat`
   - Validates input, fetches user data, computes summary + delta, calls GPT‑5.2
   File: `app/api/assistant/chat/route.ts`
6. Add request/response schemas:
   - `assistantChatRequestSchema`
   - `assistantChatResponseSchema`
   File: `lib/validations.ts`
7. Add data access helpers for assistant:
   - Meals, metrics, workouts by date range
   File: `lib/assistant/data.ts`
8. Add computation helpers:
   - totals + deltas vs previous period (e.g., last 7 vs prior 7)
   File: `lib/assistant/metrics.ts`
9. Add orchestrator to:
   - detect write intent (deflect)
   - build prompt + call GPT‑5.2 with Structured Outputs
   File: `lib/assistant/orchestrator.ts`

### C) LLM Integration (OpenAI GPT‑5.2)
10. Replace Claude usage for assistant question answering:
   - Use OpenAI responses API with GPT‑5.2
   - Structured Outputs for schema compliance
   Files: `app/api/interpret/entry/route.ts` (if reused) or `app/api/assistant/chat/route.ts` (preferred)
11. Add prompt templates and response schema for:
   - summary + delta answers
   - read‑only deflections
   File: `lib/assistant/prompts.ts`

### D) Analytics + QA
12. Add basic telemetry hooks for:
   - open rate, message count, deflection rate
   - model latency and error rate
   File: `lib/assistant/telemetry.ts` (or server logging)
13. Add QA scripts/tests for:
   - no data, partial data, timezone edge cases
   - write‑intent deflections
   Files: `tests/assistant/` (new) or lightweight script in `scripts/`
