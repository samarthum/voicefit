import { NextRequest } from "next/server";
import { z } from "zod";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  getCurrentUser,
} from "@/lib/api-helpers";
import { interpretIngredient } from "@/lib/interpretation";

// Single-ingredient lookup also goes through the agent loop with tool
// calls; lift the function ceiling above Vercel's 10s default.
export const maxDuration = 60;

// Request schema is local to this route — only used here.
const interpretIngredientRequestSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  grams: z.number().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser(request);

    const body = await request.json();
    const parseResult = interpretIngredientRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { name, grams } = parseResult.data;
    const ingredient = await interpretIngredient({ name, grams });

    return successResponse(ingredient);
  } catch (error) {
    console.error("Ingredient interpretation error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to interpret ingredient. Please try again.";
    return errorResponse(message, 500);
  }
}
