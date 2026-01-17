import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
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
    const { userId } = await auth();
    if (!userId) {
      return unauthorizedResponse();
    }

    const user = await getCurrentUser();

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
    const message =
      error instanceof Error
        ? error.message
        : "Failed to interpret meal. Please try again.";
    return errorResponse(message, 500);
  }
}
