// Recording states for voice logging flow
export type RecordingState =
  | "idle"
  | "recording"
  | "uploading"
  | "transcribing"
  | "editing"
  | "interpreting"
  | "reviewing"
  | "saving"
  | "error";

// Conversation event types
export type ConversationEventKind =
  | "meal"
  | "workout_set"
  | "weight"
  | "steps"
  | "question"
  | "system";

export type ConversationSource = "text" | "voice" | "system";

export interface ConversationEvent {
  id: string;
  userId?: string;
  kind: ConversationEventKind;
  userText: string;
  systemText: string | null;
  source: ConversationSource;
  referenceType: string | null;
  referenceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type EntryIntent = "meal" | "workout_set" | "weight" | "steps" | "question";

// Assistant chat (read-only)
export interface AssistantChatResponse {
  headline: string;
  highlights: string[];
}

export type AssistantChatRole = "user" | "assistant";

export interface AssistantChatMessage {
  id: string;
  role: AssistantChatRole;
  content: string;
  status?: "pending" | "error";
  highlights?: string[];
}

export interface MetricInterpretation {
  value: number;
  confidence: number;
  assumptions: string[];
  unit: "kg" | "steps";
}

// Meal interpretation from LLM
export interface MealInterpretation {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  description: string;
  calories: number;
  confidence: number; // 0-1
  assumptions: string[];
}

// Workout set interpretation from LLM
export interface WorkoutSetInterpretation {
  exerciseName: string;
  exerciseType: "resistance" | "cardio";
  reps: number | null;
  weightKg: number | null;
  durationMinutes: number | null;
  notes: string | null;
  confidence: number; // 0-1
  assumptions: string[];
}

export type InterpretEntryResponse =
  | {
      intent: "meal";
      payload: MealInterpretation;
      systemDraft?: string | null;
    }
  | {
      intent: "workout_set";
      payload: WorkoutSetInterpretation;
      systemDraft?: string | null;
    }
  | {
      intent: "weight";
      payload: MetricInterpretation;
      systemDraft?: string | null;
    }
  | {
      intent: "steps";
      payload: MetricInterpretation;
      systemDraft?: string | null;
    }
  | {
      intent: "question";
      payload: { answer: string };
      systemDraft?: string | null;
    };

// Dashboard data structure
export interface DashboardData {
  today: {
    calories: {
      consumed: number;
      goal: number;
    };
    steps: {
      count: number | null;
      goal: number;
    };
    weight: number | null;
    workoutSessions: number;
    workoutSets: number;
  };
  weeklyTrends: {
    date: string; // YYYY-MM-DD
    calories: number;
    steps: number | null;
    weight: number | null;
    workouts: number;
  }[];
  recentMeals: {
    id: string;
    description: string;
    calories: number;
    mealType: string;
    eatenAt: string;
  }[];
  recentExercises: string[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Meal log for display
export interface MealLogDisplay {
  id: string;
  eatenAt: string;
  mealType: string;
  description: string;
  calories: number;
  transcriptRaw: string | null;
}

// Workout session for display
export interface WorkoutSessionDisplay {
  id: string;
  startedAt: string;
  endedAt: string | null;
  title: string;
  setCount: number;
}

// Workout set for display
export interface WorkoutSetDisplay {
  id: string;
  performedAt: string;
  exerciseName: string;
  exerciseType: string;
  reps: number | null;
  weightKg: number | null;
  durationMinutes: number | null;
  notes: string | null;
  transcriptRaw: string | null;
}
