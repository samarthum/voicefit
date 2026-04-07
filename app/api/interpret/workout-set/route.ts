import { NextRequest } from "next/server";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  getCurrentUser,
} from "@/lib/api-helpers";
import { interpretWorkoutSetRequestSchema } from "@/lib/validations";
import { interpretWorkoutSet } from "@/lib/interpretation";

export async function POST(request: NextRequest) {
  try {
    await getCurrentUser(request);

    const body = await request.json();
    const parseResult = interpretWorkoutSetRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { transcript } = parseResult.data;
    const interpretation = await interpretWorkoutSet({ transcript });

    return successResponse(interpretation);
  } catch (error) {
    console.error("Workout set interpretation error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to interpret workout set. Please try again.";
    return errorResponse(message, 500);
  }
}
