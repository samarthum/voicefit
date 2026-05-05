export * from "@voicefit/contracts/types";

export type MealInterpretationStatus =
  | "interpreting"
  | "needs_review"
  | "reviewed"
  | "failed";

export interface DashboardData {
  today: {
    calories: {
      consumed: number;
      goal: number;
    };
    macros: {
      protein: number;
      carbs: number;
      fat: number;
    } | null;
    proteinGoal: number;
    steps: {
      count: number | null;
      goal: number;
    };
    weight: number | null;
    workoutSessions: number;
    workoutSets: number;
  };
  weeklyTrends: {
    date: string;
    calories: number;
    steps: number | null;
    weight: number | null;
    workouts: number;
  }[];
  recentMeals: {
    id: string;
    description: string;
    calories: number | null;
    mealType: string;
    interpretationStatus: MealInterpretationStatus;
    eatenAt: string;
  }[];
  recentExercises: string[];
}
