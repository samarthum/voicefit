import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { genAI } from "@/lib/gemini";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { interpretWorkoutSetRequestSchema, workoutSetInterpretationSchema } from "@/lib/validations";
import { EXERCISES } from "@/lib/exercises";

const SYSTEM_PROMPT = `You are a fitness coach assistant. Your task is to parse workout set descriptions from voice input.

Given a description of an exercise set, extract:
1. Exercise name - MUST map to one of the approved exercises listed below
2. Number of repetitions (reps)
3. Weight in kilograms (if mentioned)
4. Any relevant notes (like "empty barbell", "to failure", etc.)
5. Confidence score (0-1) for your interpretation
6. Assumptions made during interpretation

APPROVED EXERCISES (you MUST use one of these exact names):
${EXERCISES.join(", ")}

Guidelines:
- Map the user's input to the closest matching approved exercise name
- Common mappings: "bench" -> "Bench Press", "squats" -> "Squat", "deadlifts" -> "Deadlift", "OHP" -> "Overhead Press", "rows" -> "Barbell Row"
- If weight is mentioned in pounds, convert to kg (1 lb = 0.453592 kg, round to nearest 0.5 kg)
- "Empty barbell" typically means 20 kg (Olympic bar) - note this in assumptions but set weightKg to 20
- If reps are not mentioned, set to null
- If weight is not mentioned, set to null

You MUST respond with valid JSON matching this exact schema:
{
  "exerciseName": "exact name from approved list",
  "reps": integer or null,
  "weightKg": number or null (in kg),
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

    // Call Gemini 3 Flash for interpretation
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = `${SYSTEM_PROMPT}\n\nUser input: ${transcript}`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
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
