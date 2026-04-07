import { NextRequest } from "next/server";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  getCurrentUser,
} from "@/lib/api-helpers";
import { interpretMealRequestSchema } from "@/lib/validations";
import { interpretMeal } from "@/lib/interpretation";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    const body = await request.json();
    const parseResult = interpretMealRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { transcript, mealType, eatenAt } = parseResult.data;
    const interpretation = await interpretMeal({
      userId: user.id,
      transcript,
      mealType,
      eatenAt,
    });

    return successResponse(interpretation);
  } catch (error) {
    console.error("Meal interpretation error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to interpret meal. Please try again.";
    return errorResponse(message, 500);
  }
}
