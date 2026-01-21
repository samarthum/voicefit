# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start development server (localhost:3000)
bun run build    # Build for production (runs prisma generate first)
bun run lint     # Run ESLint
```

## Architecture

This is a Next.js 16 health tracking app with voice-first input for meals and workouts.

### Tech Stack
- **Frontend**: Next.js App Router, React 19, Tailwind CSS 4, Radix UI components
- **Backend**: Next.js API routes, Prisma ORM with Neon (serverless PostgreSQL)
- **Auth**: Clerk (`@clerk/nextjs`)
- **AI Services**: OpenAI for audio transcription (`gpt-4o-mini-transcribe`), Claude Haiku 4.5 for interpretation (`claude-3-5-haiku-20241022`)

### Data Flow
1. User records voice input via `MicRecordButton` component
2. Audio sent to `/api/transcribe` (OpenAI transcription)
3. Transcript sent to `/api/interpret/meal` or `/api/interpret/workout-set` (Claude interpretation)
4. User confirms/edits interpretation in dialog
5. Data saved via `/api/meals` or `/api/workout-sets`

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `components/` - React components (UI primitives in `components/ui/`)
- `lib/` - Shared utilities, database client, AI clients, validations
- `prisma/` - Database schema

### Database Models (Prisma)
- `AppUser` - User with Clerk ID and daily goals (calories, steps)
- `DailyMetric` - Daily steps and weight per user
- `MealLog` - Meal entries with calories and type
- `WorkoutSession` - Workout container with sets
- `WorkoutSet` - Individual exercise sets with reps/weight

### API Pattern
All API routes use helpers from `lib/api-helpers.ts`:
- `getCurrentUser()` - Get/create user from Clerk auth
- `successResponse(data)` / `errorResponse(message, status)` - Standardized JSON responses
- Request validation with Zod schemas from `lib/validations.ts`

### Environment Variables
- `DATABASE_URL` - Neon PostgreSQL connection string
- `OPENAI_API_KEY` - For audio transcription
- `ANTHROPIC_API_KEY` - For Claude interpretation
- Clerk keys for authentication
- `FITBIT_CLIENT_ID` - Fitbit OAuth client ID
- `FITBIT_CLIENT_SECRET` - Fitbit OAuth client secret
- `FITBIT_REDIRECT_URI` - Fitbit OAuth redirect URI (points to `/api/fitbit/callback`)
