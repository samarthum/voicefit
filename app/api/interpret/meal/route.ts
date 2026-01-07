import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { genAI } from "@/lib/gemini";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-helpers";
import { interpretMealRequestSchema, mealInterpretationSchema } from "@/lib/validations";

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

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return unauthorizedResponse();
    }

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

    if (eatenAt) {
      const timestamp = new Date(eatenAt);
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
    }

    if (mealType) {
      contextParts.push(`Meal type: ${mealType}`);
    }

    if (contextParts.length > 0) {
      userMessage = `[${contextParts.join(', ')}] ${transcript}`;
    }

    // Call Gemini 3 Flash for interpretation
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const prompt = `${SYSTEM_PROMPT}\n\nUser input: ${userMessage}`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    if (!content) {
      return errorResponse("Failed to interpret meal. Please try again.", 500);
    }

    // Parse and validate the response
    let interpretation;
    try {
      interpretation = JSON.parse(content);
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
