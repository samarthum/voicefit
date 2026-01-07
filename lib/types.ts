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
  reps: number | null;
  weightKg: number | null;
  notes: string | null;
  confidence: number; // 0-1
  assumptions: string[];
}

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
  reps: number;
  weightKg: number | null;
  notes: string | null;
  transcriptRaw: string | null;
}
