import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { updateUserGoalsSchema } from "@/lib/validations";

// GET /api/user/settings - Get user settings/goals
export async function GET() {
  try {
    const user = await getCurrentUser();

    return successResponse({
      calorieGoal: user.calorieGoal,
      stepGoal: user.stepGoal,
    });
  } catch (error) {
    console.error("Get user settings error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to get user settings", 500);
  }
}

// PUT /api/user/settings - Update user settings/goals
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const body = await request.json();
    const parseResult = updateUserGoalsSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const updateData: Record<string, number> = {};
    if (parseResult.data.calorieGoal !== undefined) {
      updateData.calorieGoal = parseResult.data.calorieGoal;
    }
    if (parseResult.data.stepGoal !== undefined) {
      updateData.stepGoal = parseResult.data.stepGoal;
    }

    const updatedUser = await prisma.appUser.update({
      where: { id: user.id },
      data: updateData,
    });

    return successResponse({
      calorieGoal: updatedUser.calorieGoal,
      stepGoal: updatedUser.stepGoal,
    });
  } catch (error) {
    console.error("Update user settings error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to update user settings", 500);
  }
}
