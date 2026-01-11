import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { genAI } from "@/lib/gemini";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { interpretWorkoutSetRequestSchema, workoutSetInterpretationSchema } from "@/lib/validations";
import { EXERCISES } from "@/lib/exercises";

const SYSTEM_PROMPT = `You are a fitness coach assistant. Your task is to parse workout descriptions from voice input. You handle both resistance training (sets with reps and weight) and cardio/freeform exercises (duration-based activities).

Given a workout description, extract:
1. Exercise name - For resistance training, MUST map to one of the approved exercises. For cardio, use descriptive names like "Running", "Cycling", "Dancing", "Walking", etc.
2. Exercise type - "resistance" for weight/rep-based exercises, "cardio" for duration-based activities
3. For RESISTANCE exercises: number of repetitions (reps) and weight in kilograms
4. For CARDIO exercises: duration in minutes
5. Any relevant notes
6. Confidence score (0-1) for your interpretation
7. Assumptions made during interpretation

APPROVED RESISTANCE EXERCISES:
${EXERCISES.join(", ")}

CARDIO/FREEFORM EXERCISES (examples - not limited to):
Running, Walking, Jogging, Cycling, Swimming, Dancing, Hiking, Jump Rope, Rowing (cardio), Elliptical, Stair Climbing, Boxing, Kickboxing, Yoga, Pilates, Stretching, etc.

Guidelines:
- First determine if this is resistance training (reps/sets/weight) or cardio (duration-based)
- For resistance: Map to closest approved exercise name. Common mappings: "bench" -> "Bench Press", "squats" -> "Squat"
- For cardio: Use clear, descriptive names (capitalize first letters)
- If weight is in pounds, convert to kg (1 lb = 0.453592 kg, round to nearest 0.5 kg)
- "Empty barbell" typically means 20 kg - note in assumptions
- For resistance: If reps not mentioned, set to null. If weight not mentioned, set to null. Set durationMinutes to null.
- For cardio: Set reps and weightKg to null. Extract duration (convert hours to minutes if needed)

You MUST respond with valid JSON matching this exact schema:
{
  "exerciseName": "exercise name string",
  "exerciseType": "resistance" or "cardio",
  "reps": integer or null (for resistance only),
  "weightKg": number or null (for resistance only),
  "durationMinutes": integer or null (for cardio only),
  "notes": "any relevant notes" or null,
  "confidence": number between 0 and 1,
  "assumptions": ["array of assumptions made"]
}

Only output the JSON object, no other text.`;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return unauthorizedResponse();
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = interpretWorkoutSetRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { transcript } = parseResult.data;

    // Call Gemini Flash for interpretation
    const prompt = `${SYSTEM_PROMPT}\n\nUser input: ${transcript}`;

    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    const content = result.text;
    if (!content) {
      return errorResponse("Failed to interpret workout set. Please try again.", 500);
    }

    // Parse and validate the response
    let interpretation;
    try {
      interpretation = JSON.parse(content);
    } catch {
      console.error("Failed to parse LLM response:", content);
      return errorResponse("Failed to parse interpretation. Please try again.", 500);
    }

    const validationResult = workoutSetInterpretationSchema.safeParse(interpretation);
    if (!validationResult.success) {
      console.error("LLM response validation failed:", validationResult.error);
      return errorResponse("Invalid interpretation format. Please try again.", 500);
    }

    return successResponse(validationResult.data);
  } catch (error) {
    console.error("Workout set interpretation error:", error);
    return errorResponse("Failed to interpret workout set. Please try again.", 500);
  }
}
