export * from "@voicefit/contracts/validations";

import { z } from "zod";
import {
  mealIngredientSchema,
  mealTypeSchema,
} from "@voicefit/contracts/validations";

export const mealInterpretationStatusSchema = z.enum([
  "interpreting",
  "needs_review",
  "reviewed",
  "failed",
]);

export const interpretMealLogRequestSchema = z
  .object({
    text: z.string().min(1).optional(),
    transcript: z.string().min(1).optional(),
    mealType: mealTypeSchema.optional(),
    eatenAt: z.string().datetime().optional(),
  })
  .refine((value) => value.text || value.transcript, {
    message: "Text is required",
    path: ["text"],
  });

export const createMealSchema = z.object({
  eatenAt: z.string().datetime(),
  mealType: mealTypeSchema,
  description: z.string().min(1, "Description is required"),
  interpretationStatus: mealInterpretationStatusSchema.optional(),
  calories: z.number().int().min(0, "Calories must be non-negative").nullable().optional(),
  proteinG: z.number().min(0).nullable().optional(),
  carbsG: z.number().min(0).nullable().optional(),
  fatG: z.number().min(0).nullable().optional(),
  ingredients: z.array(mealIngredientSchema).optional(),
  transcriptRaw: z.string().optional(),
});

export const updateMealSchema = z.object({
  eatenAt: z.string().datetime().optional(),
  mealType: mealTypeSchema.optional(),
  description: z.string().min(1).optional(),
  interpretationStatus: mealInterpretationStatusSchema.optional(),
  calories: z.number().int().min(0).nullable().optional(),
  proteinG: z.number().min(0).nullable().optional(),
  carbsG: z.number().min(0).nullable().optional(),
  fatG: z.number().min(0).nullable().optional(),
  ingredients: z.array(mealIngredientSchema).optional(),
});
