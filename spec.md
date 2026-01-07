## Personal Voice-Based Health Tracker — Product + Technical Spec (v0)

### 1) Goal

Build a **simple Next.js web app** for daily health tracking where **all logging is voice-first** (audio → transcript → structured data via LLM → confirm/edit → save → UI updates).

Primary metrics to track:

* **Calories / meals** (calorie estimate only; no macros in v0)
* **Workouts** (sessions + exercise sets)
* **Steps** (daily)
* **Body weight** (daily)

Primary pain-point to solve:

* Tracking is annoying because typing on phone is friction; **voice should be fastest**.

---

## 2) Core User Stories

### 2.1 Authentication

* As a user, I can sign in (Clerk).
* As a user, my data is private to my account.

### 2.2 Meal logging (voice-first)

* As a user, I can press a mic button and say:
  “For breakfast I had two fried eggs and a banana and some hummus.”
* The app transcribes audio using **GPT-4o-Transcribe**.
* I can **edit the transcript** before sending it to the LLM.
* The app sends the transcript to **GPT-5.2 Thinking (high)** to produce:

  * an **approximate calorie estimate**
  * a **structured meal log**
* I can **edit/adjust** the interpreted meal log (e.g., calories, meal name/type) before saving.
* When saved:

  * it writes to the database (Neon Postgres via Prisma)
  * the dashboard updates immediately

### 2.3 Workout logging (voice-first, within a session)

* As a user, I can start a workout session.
* Within that session, I can record sets by voice, e.g.:
  “First set of squats, empty barbell, five reps.”
* The app transcribes → I can edit transcript → LLM converts to structured log → I can confirm/edit → save.
* The workout session view updates to show the set(s) added.

### 2.4 Steps logging (simple daily entry; voice optional but not required)

* As a user, I can log my steps for the day (number).
* (Optional voice flow uses same pipeline: transcribe → parse number → confirm → save.)

### 2.5 Weight logging (simple daily entry; voice optional but not required)

* As a user, I can log my body weight for the day (number).
* (Optional voice flow uses same pipeline.)

### 2.6 Daily goals (basic)

* As a user, I can set a daily calorie goal (target number).
* As a user, I can set a daily step goal (target number).
* The dashboard shows simple progress toward these goals (e.g., "1200 / 2000 kcal").
* No alerts or warnings when approaching/exceeding limits (keep it simple).

### 2.7 Edit/delete entries

* As a user, I can edit any previously logged meal (modify calories, description, meal type).
* As a user, I can delete any previously logged meal.
* As a user, I can edit or delete workout sessions and individual sets.
* As a user, I can edit or delete daily metrics (steps, weight).

---

## 3) App IA / Pages (Tabs)

### 3.1 Dashboard (tab)

Shows:

* **Today's summary**

  * total calories logged today (with progress toward daily goal if set)
  * meals logged today (simple list)
  * steps today (with progress toward daily goal if set)
  * weight today
  * workout status today (e.g., "1 session")
* **Weekly trend summary** (line graphs)

  * total calories per day (last 7 days)
  * weight trend (last 7 days)
  * steps per day (last 7 days)
  * workouts per day (count)

**Design tone**: Data-focused, clean UI with no gamification or motivational fluff.

Actions:

* Quick buttons: **Log Meal (mic)**, **Log Steps**, **Log Weight**, **Start Workout**
* **Quick-add from history**: Show recent meals/exercises for manual quick-add without voice

### 3.2 Meal Logs (tab)

* List of all meals (most recent first)
* Filter by date range (optional in v0; can be basic "last 7 / 30 / all")
* Click meal to view detail (transcript + structured + calories + timestamp)
* **Edit/delete**: Users can modify any field or delete entries entirely

### 3.3 Workout Logs (tab)

* List of workout sessions (most recent first)
* Click session to view:

  * session start time/end time
  * exercises and sets (strength training only: exercise, reps, weight)
  * "Add set (mic)" button
  * **"End Workout" button**: User manually ends session when done
* **Edit/delete**: Users can modify sets/sessions or delete entries entirely

---

## 4) Voice Logging UX (Canonical Flow)

This flow is reused for meals and workout sets (and optionally steps/weight).

### 4.1 Flow steps

1. User **holds** the mic button to record (**push-to-talk** interaction)
2. User **releases** the button to stop recording
3. App sends audio to server → **GPT-4o Transcribe**
4. UI shows **Transcript Editor**

   * editable text area
   * “Continue” button
5. App sends transcript to server → **GPT-5.2 Thinking (high)** for parsing/estimation
6. UI shows **Interpretation Review**

   * structured fields
   * calories estimate (for meal)
   * “Save” button
   * user can edit fields before saving
7. On save:

   * server validates payload
   * writes to DB
   * returns updated “today summary” payload (or minimal newly-created record)
8. Client updates UI (optimistic update optional; otherwise re-fetch)

### 4.2 Required UI states

* Recording (timer + stop)
* Uploading audio
* Transcribing
* Transcript editing
* Parsing/Estimating
* Review/edit structured result
* Saving
* Error states (transcription failed, parse failed, validation failed, DB failed)

---

## 5) Data Model (Prisma + Postgres / Neon)

### 5.1 Entities (high-level)

* User (from Clerk; store clerkUserId)
* DailyMetric (per user per day): steps, weight (optional)
* MealLog
* WorkoutSession
* WorkoutSet (belongs to session)

### 5.2 Prisma schema (suggested)

```prisma
model AppUser {
  id           String   @id @default(cuid())
  clerkUserId  String   @unique
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Daily goals (basic, no alerts)
  calorieGoal  Int?     // daily calorie target
  stepGoal     Int?     // daily step target

  dailyMetrics    DailyMetric[]
  meals           MealLog[]
  workoutSessions WorkoutSession[]
}

model DailyMetric {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime // normalized to day start in user timezone
  steps     Int?
  weightKg  Float?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user AppUser @relation(fields: [userId], references: [id])

  @@unique([userId, date])
}

model MealLog {
  id             String   @id @default(cuid())
  userId         String
  eatenAt        DateTime
  mealType       String?  // breakfast/lunch/dinner/snack (optional inference)
  description    String   // cleaned description (from transcript or edited)
  transcriptRaw  String   // the final transcript user approved
  calories       Int      // approximate
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user AppUser @relation(fields: [userId], references: [id])

  @@index([userId, eatenAt])
}

model WorkoutSession {
  id         String   @id @default(cuid())
  userId     String
  startedAt  DateTime
  endedAt    DateTime?
  title      String?  // optional e.g. "Gym"
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user AppUser @relation(fields: [userId], references: [id])
  sets WorkoutSet[]

  @@index([userId, startedAt])
}

model WorkoutSet {
  id            String   @id @default(cuid())
  sessionId     String
  performedAt   DateTime
  exerciseName  String   // e.g. "squat"
  reps          Int?
  weightKg      Float?   // optional; "empty barbell" can map to null or 20
  notes         String?  // e.g. "empty barbell"
  transcriptRaw String   // final transcript user approved

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  session WorkoutSession @relation(fields: [sessionId], references: [id])

  @@index([sessionId, performedAt])
}
```

**Notes on “empty barbell”:**

* Keep it simple in v0: store `notes="empty barbell"` and optionally set `weightKg=null` unless user edits it.

---

## 6) API Design (Next.js App Router)

### 6.1 Auth

* Use Clerk middleware to protect routes and API endpoints.
* Server resolves `AppUser` from `clerkUserId` (create on first use).

### 6.2 Endpoints (suggested)

**Voice pipeline**

* `POST /api/transcribe`

  * input: audio file (multipart/form-data)
  * output: `{ transcript: string }`
  * uses: GPT-4o Transcribe

* `POST /api/interpret/meal`

  * input: `{ transcript: string, eatenAt?: string }`
  * output: structured JSON meal interpretation (see schema below)
  * uses: GPT-5.2 Thinking (high)

* `POST /api/interpret/workout-set`

  * input: `{ transcript: string, performedAt?: string }`
  * output: structured workout-set JSON (see schema below)
  * uses: GPT-5.2 Thinking (high)

**Persistence**

* `POST /api/meals`

  * input: meal object (validated)
  * output: created `MealLog`

* `POST /api/workout-sessions`

  * input: `{ startedAt?: string, title?: string }`
  * output: created `WorkoutSession`

* `POST /api/workout-sessions/:id/sets`

  * input: workout set object
  * output: created `WorkoutSet`

**Daily metrics**

* `PUT /api/daily-metrics/:date`

  * input: `{ steps?: number, weightKg?: number }`
  * upserts by (userId, date)
  * output: updated DailyMetric

**Goals**

* `PUT /api/user/goals`

  * input: `{ calorieGoal?: number, stepGoal?: number }`
  * updates user's daily goals
  * output: updated AppUser

**Edit/Delete**

* `PUT /api/meals/:id`

  * input: updated meal object
  * output: updated MealLog

* `DELETE /api/meals/:id`

  * deletes the meal

* `PUT /api/workout-sessions/:id`

  * input: updated session object
  * output: updated WorkoutSession

* `DELETE /api/workout-sessions/:id`

  * deletes session and all its sets

* `PUT /api/workout-sessions/:sessionId/sets/:setId`

  * input: updated set object
  * output: updated WorkoutSet

* `DELETE /api/workout-sessions/:sessionId/sets/:setId`

  * deletes the set

* `DELETE /api/daily-metrics/:date`

  * deletes the daily metric for that date

**Queries**

* `GET /api/dashboard?date=YYYY-MM-DD`

  * returns today summary + last 7 days rollups + user goals
* `GET /api/meals?cursor=...`
* `GET /api/meals/recent` (for quick-add suggestions)
* `GET /api/workout-sessions?cursor=...`
* `GET /api/workout-sessions/:id`
* `GET /api/exercises/recent` (for quick-add suggestions)

---

## 7) LLM Contracts (Strict JSON Outputs)

### 7.1 Meal interpretation output schema

Server enforces a Zod schema like:

```ts
{
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | null,
  description: string,
  calories: number,         // integer
  confidence: number,       // 0..1 (optional but useful)
  assumptions: string[]     // brief list; shown to user
}
```

LLM prompt intent:

* Take transcript, infer meal description and approximate calories.
* Be conservative and reasonable.
* Produce machine-readable JSON only.

### 7.2 Workout set interpretation output schema

```ts
{
  exerciseName: string,
  reps: number | null,
  weightKg: number | null,
  notes: string | null,
  confidence: number,        // 0..1
  assumptions: string[]      // e.g. interpreted "empty barbell"
}
```

LLM prompt intent:

* Convert natural language into a single set record.
* If missing values, set null and include assumptions.

### 7.3 “User can edit before saving”

Important: The LLM output is **not written to DB directly**.

* Client shows it in a form
* User edits fields
* Server validates final payload
* Then persist

---

## 8) UI Components (Shadcn/UI)

### Shared components

* `MicRecordButton` (**push-to-talk**: hold to record, release to stop; shows waveform/timer)
* `TranscriptEditorDialog`
* `InterpretationReviewDialog` (meal / workout set variants)
* `ConfirmSaveButton` with loading states
* `TodaySummaryCard` (includes progress toward goals if set)
* `WeeklyTrendsCard` (line graphs for trends)
* `RecentItemsPicker` (quick-add from recent meals/exercises)
* `EditEntryDialog` (for editing existing entries)
* `DeleteConfirmDialog`

### Dashboard layout

* Top: “Today”
* Middle: action buttons
* Bottom: weekly trends

### Logs pages

* Table/list with timestamp + key fields
* Detail drawer/page on click

---

## 9) System Behavior & Edge Cases

### Transcription errors

* If transcription fails:

  * show error message
  * allow re-record or retry upload

### Parsing/interpretation errors

* If GPT-5.2 fails or returns invalid JSON:

  * show error
  * allow retry
  * transcript remains editable

### Validation rules (server-side)

* Calories must be integer ≥ 0
* Steps must be integer ≥ 0
* WeightKg must be reasonable range (e.g. 20–300) (can be permissive in v0)
* Reps integer ≥ 0 (nullable)
* EatenAt/performedAt defaults to “now” if not provided

### Timezone

* Dates for "today" and daily metrics should be computed in **user timezone** (auto-detected from browser):

  * store timestamps in UTC
  * client sends browser timezone with requests
  * normalize "date key" at server using provided timezone

---

## 10) Tech Stack Constraints (as stated)

* Next.js web app (**mobile-first responsive**, not PWA)
* Neon Postgres + Prisma
* Clerk auth
* Shadcn/UI components
* Transcription: **GPT-4o Transcribe**
* Reasoning/estimation/parsing: **GPT-5.2 Thinking (high)**

### 10.1 Platform & UX Decisions

* **Platform**: Mobile-first responsive web app (optimized for mobile browsers, no offline/PWA features in v0)
* **Units**: Metric only (kg for weight)
* **Date/time format**: ISO format (YYYY-MM-DD), 24-hour time
* **Timezone**: Auto-detect from browser (no hardcoded timezone)

---

## 11) Non-Goals (v0)

* Macronutrients, micronutrients
* Barcode scanning, food database integrations
* Automatic step/weight syncing from devices
* Complex workout programming (PR tracking, periodization, etc.)
* Multi-user sharing

---

## 12) Acceptance Criteria (v0 "done")

* User can sign in and sees a dashboard.
* User can log a meal by voice (push-to-talk):

  * transcript appears and is editable
  * calories estimate + structured meal appear
  * user can edit and save
  * dashboard updates with today's calories + meal list
* User can start a workout session and add sets by voice:

  * each set becomes a structured record (strength training: exercise, reps, weight)
  * session view updates live
  * user can manually end the session with "End Workout" button
* User can log steps and weight for the day.
* Meal logs and workout logs are browsable historically.
* User can set daily calorie and step goals, with progress shown on dashboard.
* User can edit or delete any logged entry (meals, workouts, sets, daily metrics).
* User can quick-add from recent meals/exercises without using voice.
* Weekly trends are displayed as line graphs.
* App uses ISO date format (YYYY-MM-DD) and 24-hour time.
* Timezone is auto-detected from browser.
