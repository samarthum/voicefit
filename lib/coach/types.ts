// Type-safe UIMessage for Coach v2.
//
// The single source of truth lives in `@voicefit/contracts/coach` so the
// mobile app can import the same type. We just re-export it here for use
// from the web codebase. See `voicefit/spec-coach-v2.md` §8.5.1.

export type { CoachUIMessage, CoachUITools } from "@voicefit/contracts/coach";
