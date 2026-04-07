# Mobile Regression Matrix (P4-T1)

## 1) Device Matrix
| Platform | Device | Runtime | Status |
| --- | --- | --- | --- |
| Android | Physical device (Expo Go) | `bun run start --tunnel` | Active lane |
| iOS | iOS simulator | `bun run ios` | Pending local Xcode setup |
| iOS | Physical device (Expo Go) | `bun run start --tunnel` | Optional for beta sign-off |

## 2) Critical Path Checklist
Use this list before any mobile release candidate.

### Auth and Shell
- Sign in with Google from `/sign-in`.
- Session persists after app restart.
- Signed-out state redirects to `/sign-in`.

### Dashboard and Metrics
- Dashboard loads calories, steps, weight without crash.
- Manual metrics save (`/api/daily-metrics`) updates dashboard.
- Invalid metrics input shows validation errors.

### Voice Meal Log
- Record audio, transcribe, edit transcript, interpret meal, save meal.
- Short/empty recording path returns safe error.
- Saved meal appears in Meals tab.

### Meals
- List load + pagination.
- Date filter valid + invalid inputs.
- View/edit meal and save.
- Delete meal.

### Workouts
- Create session from Workouts tab.
- Open session detail page.
- Add/edit/delete set.
- Edit session title.
- End session.
- Delete session and return to workouts list.

### Conversation Feed
- Feed loads timeline from `/api/conversation`.
- Quick entry handles meal/workout/steps/weight/question intents.
- Kind/date filters and pagination work.

### Coach (Read-Only)
- Send prompt to `/api/assistant/chat`.
- Headline + highlights render.
- Error path renders non-crashing failure message.

### Fitbit (Web Connect + Mobile Management)
- Open web settings from mobile settings.
- Fitbit status loads from `/api/fitbit/status`.
- Sync today calls `/api/fitbit/sync`.
- Disconnect calls `/api/fitbit/disconnect`.

## 3) API Contract Smoke Checks
Run against local backend or deployed API.

```bash
cd /Users/samarth/Desktop/Work/voicefit-all/voicefit
bun run qa:mobile-api-smoke
```

Authenticated mode (recommended):

```bash
cd /Users/samarth/Desktop/Work/voicefit-all/voicefit
TOKEN="<clerk_bearer_token>" BASE_URL="http://localhost:3000" bun run qa:mobile-api-smoke
```

Optional assistant check:

```bash
cd /Users/samarth/Desktop/Work/voicefit-all/voicefit
TOKEN="<clerk_bearer_token>" INCLUDE_ASSISTANT=1 bun run qa:mobile-api-smoke
```

## 4) Release Sign-off Gates
- `voicefit-mobile` typecheck passes.
- `voicefit` production build passes.
- API smoke checks pass at least in unauth + authenticated modes.
- Android manual critical path checklist complete.
- iOS checklist complete (or explicitly waived with date and owner).

