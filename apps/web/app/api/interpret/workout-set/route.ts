import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { interpretWorkoutSetRequestSchema } from "@/lib/validations";
import { interpretWorkoutSet } from "@/lib/interpretation";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return unauthorizedResponse();
    }

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
    const message =
      error instanceof Error
        ? error.message
        : "Failed to interpret workout set. Please try again.";
    return errorResponse(message, 500);
  }
}
