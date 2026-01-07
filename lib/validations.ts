import { z } from "zod";

// Meal types enum
export const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);

// Transcribe request
export const transcribeRequestSchema = z.object({
  audio: z.instanceof(File).or(z.instanceof(Blob)),
});

// Meal interpretation request
export const interpretMealRequestSchema = z.object({
  transcript: z.string().min(1, "Transcript is required"),
  mealType: mealTypeSchema.optional(),
  eatenAt: z.string().datetime().optional(),
});

// Meal interpretation response from LLM
export const mealInterpretationSchema = z.object({
  mealType: mealTypeSchema,
  description: z.string(),
  calories: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string()),
});

// Workout set interpretation request
export const interpretWorkoutSetRequestSchema = z.object({
  transcript: z.string().min(1, "Transcript is required"),
  performedAt: z.string().datetime().optional(),
});

// Workout set interpretation response from LLM
export const workoutSetInterpretationSchema = z.object({
  exerciseName: z.string(),
  reps: z.number().int().min(0).nullable(),
  weightKg: z.number().min(0).nullable(),
  notes: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string()),
});

// Create meal request
export const createMealSchema = z.object({
  eatenAt: z.string().datetime(),
  mealType: mealTypeSchema,
  description: z.string().min(1, "Description is required"),
  calories: z.number().int().min(0, "Calories must be non-negative"),
  transcriptRaw: z.string().optional(),
});

// Update meal request
export const updateMealSchema = z.object({
  eatenAt: z.string().datetime().optional(),
  mealType: mealTypeSchema.optional(),
  description: z.string().min(1).optional(),
  calories: z.number().int().min(0).optional(),
});

// Create workout session request
export const createWorkoutSessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startedAt: z.string().datetime().optional(),
});

// Update workout session request
export const updateWorkoutSessionSchema = z.object({
  title: z.string().min(1).optional(),
  endedAt: z.string().datetime().optional(),
});

// Create workout set request
export const createWorkoutSetSchema = z.object({
  sessionId: z.string().cuid(),
  performedAt: z.string().datetime().optional(),
  exerciseName: z.string().min(1, "Exercise name is required"),
  reps: z.number().int().min(0, "Reps must be non-negative"),
  weightKg: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  transcriptRaw: z.string().optional(),
});

// Update workout set request
export const updateWorkoutSetSchema = z.object({
  exerciseName: z.string().min(1).optional(),
  reps: z.number().int().min(0).optional(),
  weightKg: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Daily metrics upsert request
export const upsertDailyMetricsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  steps: z.number().int().min(0).optional().nullable(),
  weightKg: z.number().min(20).max(300).optional().nullable(),
});

// User goals update request
export const updateUserGoalsSchema = z.object({
  calorieGoal: z.number().int().min(500).max(10000).optional(),
  stepGoal: z.number().int().min(1000).max(100000).optional(),
});

// Query params for listing
export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Type exports
export type MealType = z.infer<typeof mealTypeSchema>;
export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
export type CreateWorkoutSessionInput = z.infer<typeof createWorkoutSessionSchema>;
export type UpdateWorkoutSessionInput = z.infer<typeof updateWorkoutSessionSchema>;
export type CreateWorkoutSetInput = z.infer<typeof createWorkoutSetSchema>;
export type UpdateWorkoutSetInput = z.infer<typeof updateWorkoutSetSchema>;
export type UpsertDailyMetricsInput = z.infer<typeof upsertDailyMetricsSchema>;
export type UpdateUserGoalsInput = z.infer<typeof updateUserGoalsSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
