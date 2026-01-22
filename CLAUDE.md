# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Root workspace commands
bun install          # Install all dependencies
bun dev              # Start web development server (localhost:3000)
bun dev:web          # Start web development server
bun dev:mobile       # Start Expo development server
bun build            # Build web app for production

# Web app commands (from apps/web or root)
bun run --cwd apps/web dev
bun run --cwd apps/web build
bun run --cwd apps/web lint

# Mobile app commands (from apps/mobile)
cd apps/mobile
bun start            # Start Expo
bun ios              # Run on iOS simulator
bun android          # Run on Android emulator
bun build:dev        # EAS development build
bun build:preview    # EAS preview build
bun build:prod       # EAS production build
```

## Architecture

This is a monorepo containing a voice-first health tracking app with web (Next.js) and mobile (Expo/React Native) clients.

### Monorepo Structure
```
voicefit/
├── apps/
│   ├── web/                # Next.js web app
│   └── mobile/             # Expo React Native app
├── packages/
│   └── shared/             # Shared types, validations, constants
└── prisma/                 # Database schema (used by web)
```

### Tech Stack

**Web (apps/web)**
- Next.js 16 App Router, React 19, Tailwind CSS 4, Radix UI
- Prisma ORM with Neon (serverless PostgreSQL)
- Clerk (`@clerk/nextjs`)

**Mobile (apps/mobile)**
- Expo SDK 52, React Native, Expo Router
- NativeWind (Tailwind for RN), @gorhom/bottom-sheet
- Clerk (`@clerk/clerk-expo`)
- expo-audio for voice recording

**Shared (packages/shared)**
- TypeScript types
- Zod validation schemas
- Constants (exercises, meal types)

**Backend/AI**
- OpenAI for audio transcription (`gpt-4o-mini-transcribe`)
- Claude Haiku 4.5 for interpretation (`claude-haiku-4-5`)

### Data Flow
1. User records voice input (web: MicRecordButton, mobile: ConversationInput)
2. Audio sent to `/api/transcribe` (OpenAI transcription)
3. Transcript sent to `/api/interpret/entry` (Claude interpretation)
4. User confirms/edits interpretation in dialog/bottom sheet
5. Data saved via `/api/meals`, `/api/workout-sets`, or `/api/daily-metrics`

### Key Directories

**Web (apps/web)**
- `app/` - Next.js App Router pages and API routes
- `components/` - React components (UI primitives in `components/ui/`)
- `lib/` - Utilities, database client, AI clients

**Mobile (apps/mobile)**
- `app/` - Expo Router routes (file-based)
- `components/` - React Native components
- `hooks/` - Custom hooks (voice recorder, etc.)
- `lib/` - API client, utilities

**Shared (packages/shared)**
- `types/` - TypeScript interfaces
- `validations/` - Zod schemas
- `constants/` - Exercise list, meal types

### Database Models (Prisma)
- `AppUser` - User with Clerk ID and daily goals (calories, steps)
- `DailyMetric` - Daily steps and weight per user
- `MealLog` - Meal entries with calories and type
- `WorkoutSession` - Workout container with sets
- `WorkoutSet` - Individual exercise sets with reps/weight

### API Pattern
All API routes use helpers from `apps/web/lib/api-helpers.ts`:
- `getCurrentUser()` - Get/create user from Clerk auth
- `successResponse(data)` / `errorResponse(message, status)` - Standardized JSON responses
- Request validation with Zod schemas

Mobile app calls these same API routes via the deployed Vercel URL.

### Environment Variables

**Web (apps/web/.env)**
- `DATABASE_URL` - Neon PostgreSQL connection string
- `OPENAI_API_KEY` - For audio transcription
- `ANTHROPIC_API_KEY` - For Claude interpretation
- Clerk keys for authentication

**Mobile (apps/mobile/.env)**
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `EXPO_PUBLIC_API_URL` - Deployed API URL (e.g., https://voicefit.vercel.app)
