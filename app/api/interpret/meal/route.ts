import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { genAI } from "@/lib/gemini";
import { errorResponse, successResponse, unauthorizedResponse, getCurrentUser } from "@/lib/api-helpers";
import { interpretMealRequestSchema, mealInterpretationSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";
import { Type } from "@google/genai";

const SYSTEM_PROMPT = `You are a nutrition expert assistant. Your task is to analyze meal descriptions and provide calorie estimates.

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

// Function declaration for searching previous meals
const searchPreviousMealsFunction = {
  name: "searchPreviousMeals",
  description: "Search for the user's previous meals to reference when they mention eating the same thing as before. Returns meals from the past 7 days.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      daysAgo: {
        type: Type.INTEGER,
        description: "Number of days in the past to search (1 for yesterday, 2 for day before, etc.). Defaults to 1."
      },
      mealType: {
        type: Type.STRING,
        description: "Filter by meal type: breakfast, lunch, dinner, or snack. Optional.",
        enum: ["breakfast", "lunch", "dinner", "snack"]
      }
    },
    required: []
  }
};

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get user
    const { userId } = await auth();
    if (!userId) {
      return unauthorizedResponse();
    }

    const user = await getCurrentUser();

    // Parse and validate request body
    const body = await request.json();
    const parseResult = interpretMealRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { transcript, mealType, eatenAt } = parseResult.data;

    // Build user message with optional context
    let userMessage = transcript;
    const contextParts: string[] = [];

    // Use provided timestamp or current time
    const timestamp = eatenAt ? new Date(eatenAt) : new Date();
    const timeStr = timestamp.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const dateStr = timestamp.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    contextParts.push(`Time: ${dateStr} at ${timeStr}`);

    if (mealType) {
      contextParts.push(`Meal type: ${mealType}`);
    }

    userMessage = `[${contextParts.join(', ')}] ${transcript}`;

    // Call Gemini with function calling support
    const prompt = `${SYSTEM_PROMPT}\n\nUser input: ${userMessage}`;

    let result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ functionDeclarations: [searchPreviousMealsFunction] }]
      }
    });

    // Handle function calls
    console.log("Result object:", JSON.stringify(result, null, 2));
    const functionCalls = result.functionCalls;
    console.log("Function calls:", functionCalls);

    if (functionCalls && functionCalls.length > 0) {
      const functionCall = functionCalls[0];
      console.log("Processing function call:", functionCall.name);

      if (functionCall.name === "searchPreviousMeals") {
        // Execute the function
        const args = functionCall.args as { daysAgo?: number; mealType?: string };
        const daysAgo = args.daysAgo || 1;
        const mealTypeFilter = args.mealType;

        // Calculate the target date
        const targetDate = new Date(timestamp);
        targetDate.setDate(targetDate.getDate() - daysAgo);

        // Search for meals on that day (with some tolerance)
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const meals = await prisma.mealLog.findMany({
          where: {
            userId: user.id,
            eatenAt: {
              gte: startOfDay,
              lte: endOfDay
            },
            ...(mealTypeFilter ? { mealType: mealTypeFilter } : {})
          },
          orderBy: {
            eatenAt: 'desc'
          },
          select: {
            eatenAt: true,
            mealType: true,
            description: true,
            calories: true
          }
        });

        // Format response
        const functionResponse = meals.map((meal: { eatenAt: Date; mealType: string; description: string; calories: number }) => ({
          date: meal.eatenAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          time: meal.eatenAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          mealType: meal.mealType,
          description: meal.description,
          calories: meal.calories
        }));

        // Send function result back to model
        result = await genAI.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            { text: prompt },
            { functionResponse: {
              name: functionCall.name,
              response: { meals: functionResponse }
            }}
          ],
          config: {
            tools: [{ functionDeclarations: [searchPreviousMealsFunction] }]
          }
        });
      }
    }

    const content = result.text;
    if (!content) {
      return errorResponse("Failed to interpret meal. Please try again.", 500);
    }

    // Parse and validate the response
    let interpretation;
    try {
      // Strip markdown code fences if present
      const cleanedContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      interpretation = JSON.parse(cleanedContent);
    } catch {
      console.error("Failed to parse LLM response:", content);
      return errorResponse("Failed to parse interpretation. Please try again.", 500);
    }

    const validationResult = mealInterpretationSchema.safeParse(interpretation);
    if (!validationResult.success) {
      console.error("LLM response validation failed:", validationResult.error);
      return errorResponse("Invalid interpretation format. Please try again.", 500);
    }

    return successResponse(validationResult.data);
  } catch (error) {
    console.error("Meal interpretation error:", error);
    return errorResponse("Failed to interpret meal. Please try again.", 500);
  }
}
