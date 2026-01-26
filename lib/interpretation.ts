"use server";

import { prisma } from "@/lib/db";
import { anthropic } from "@/lib/claude";
import { EXERCISES } from "@/lib/exercises";
import { mealInterpretationSchema, workoutSetInterpretationSchema } from "@/lib/validations";

const MEAL_SYSTEM_PROMPT = `You are a nutrition expert assistant. Your task is to analyze meal descriptions and provide calorie estimates.

Given a meal description (which may be a transcript from voice input), you must:
1. Clean up and summarize the meal description
2. Estimate the total calories for the meal
3. Determine the meal type (breakfast, lunch, dinner, or snack) based on context, typical meal patterns, and timestamp if provided
4. Provide a confidence score (0-1) for your estimate
5. List any assumptions you made

Guidelines for calorie estimation:
- Use standard portion sizes unless specified
- Be conservative with estimates (prefer slightly lower if unsure)
- Consider typical restaurant vs home-cooked portions
- Round calories to nearest 10 for estimates under 500, nearest 50 for larger meals

You MUST respond with valid JSON matching this exact schema:
{
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "description": "cleaned up meal description",
  "calories": integer (estimated total calories),
  "confidence": number between 0 and 1,
  "assumptions": ["array of assumptions made"]
}

Only output the JSON object, no other text.`;

const searchPreviousMealsTool = {
  name: "searchPreviousMeals",
  description:
    "Search for the user's previous meals to reference when they mention eating the same thing as before. Returns meals from the past 7 days.",
  input_schema: {
    type: "object" as const,
    properties: {
      daysAgo: {
        type: "integer" as const,
        description:
          "Number of days in the past to search (1 for yesterday, 2 for day before, etc.). Defaults to 1.",
      },
      mealType: {
        type: "string" as const,
        description:
          "Filter by meal type: breakfast, lunch, dinner, or snack. Optional.",
        enum: ["breakfast", "lunch", "dinner", "snack"],
      },
    },
    required: [] as string[],
  },
};

const WORKOUT_SYSTEM_PROMPT = `You are a fitness coach assistant. Your task is to parse workout descriptions from voice input. You handle both resistance training (sets with reps and weight) and cardio/freeform exercises (duration-based activities).

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

interface InterpretMealInput {
  userId: string;
  transcript: string;
  mealType?: string;
  eatenAt?: string;
}

export async function interpretMeal({
  userId,
  transcript,
  mealType,
  eatenAt,
}: InterpretMealInput) {
  const contextParts: string[] = [];
  const timestamp = eatenAt ? new Date(eatenAt) : new Date();

  const timeStr = timestamp.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = timestamp.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  contextParts.push(`Time: ${dateStr} at ${timeStr}`);

  if (mealType) {
    contextParts.push(`Meal type: ${mealType}`);
  }

  const userMessage = `[${contextParts.join(", ")}] ${transcript}`;

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: MEAL_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    tools: [searchPreviousMealsTool],
  });

  // Handle tool use (function calling)
  if (response.stop_reason === "tool_use") {
    const toolUse = response.content.find((block) => block.type === "tool_use");

    if (toolUse && toolUse.type === "tool_use" && toolUse.name === "searchPreviousMeals") {
      const args = toolUse.input as { daysAgo?: number; mealType?: string };
      const daysAgo = args.daysAgo || 1;
      const mealTypeFilter = args.mealType;

      const targetDate = new Date(timestamp);
      targetDate.setDate(targetDate.getDate() - daysAgo);

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const meals = await prisma.mealLog.findMany({
        where: {
          userId,
          eatenAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          ...(mealTypeFilter ? { mealType: mealTypeFilter } : {}),
        },
        orderBy: {
          eatenAt: "desc",
        },
        select: {
          eatenAt: true,
          mealType: true,
          description: true,
          calories: true,
        },
      });

      const functionResponse = meals.map((meal) => ({
        date: meal.eatenAt.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        time: meal.eatenAt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        mealType: meal.mealType,
        description: meal.description,
        calories: meal.calories,
      }));

      // Continue conversation with tool result
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        system: MEAL_SYSTEM_PROMPT,
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: JSON.stringify({ meals: functionResponse }),
              },
            ],
          },
        ],
        tools: [searchPreviousMealsTool],
      });
    }
  }

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === "text");
  const content = textBlock && textBlock.type === "text" ? textBlock.text : null;

  if (!content) {
    throw new Error("Failed to interpret meal. Please try again.");
  }

  let interpretation: unknown;
  try {
    const cleanedContent = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    interpretation = JSON.parse(cleanedContent);
  } catch {
    throw new Error("Failed to parse interpretation. Please try again.");
  }

  const validationResult = mealInterpretationSchema.safeParse(interpretation);
  if (!validationResult.success) {
    throw new Error("Invalid interpretation format. Please try again.");
  }

  return validationResult.data;
}

interface InterpretWorkoutSetInput {
  transcript: string;
}

export async function interpretWorkoutSet({ transcript }: InterpretWorkoutSetInput) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: WORKOUT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: transcript }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const content = textBlock && textBlock.type === "text" ? textBlock.text : null;

  if (!content) {
    throw new Error("Failed to interpret workout set. Please try again.");
  }

  let interpretation: unknown;
  try {
    const cleanedContent = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    interpretation = JSON.parse(cleanedContent);
  } catch {
    throw new Error("Failed to parse interpretation. Please try again.");
  }

  const validationResult = workoutSetInterpretationSchema.safeParse(interpretation);
  if (!validationResult.success) {
    throw new Error("Invalid interpretation format. Please try again.");
  }

  return validationResult.data;
}
