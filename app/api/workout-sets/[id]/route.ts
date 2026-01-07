import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/api-helpers";
import { updateWorkoutSetSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/workout-sets/[id] - Update workout set
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    // Verify set exists and belongs to user's session
    const existingSet = await prisma.workoutSet.findFirst({
      where: {
        id,
        session: {
          userId: user.id,
        },
      },
    });

    if (!existingSet) {
      return notFoundResponse("Workout set");
    }

    const body = await request.json();
    const parseResult = updateWorkoutSetSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const updateData: Record<string, unknown> = {};
    if (parseResult.data.exerciseName) {
      updateData.exerciseName = parseResult.data.exerciseName;
    }
    if (parseResult.data.reps !== undefined) {
      updateData.reps = parseResult.data.reps;
    }
    if (parseResult.data.weightKg !== undefined) {
      updateData.weightKg = parseResult.data.weightKg;
    }
    if (parseResult.data.notes !== undefined) {
      updateData.notes = parseResult.data.notes;
    }

    const set = await prisma.workoutSet.update({
      where: { id },
      data: updateData,
    });

    return successResponse(set);
  } catch (error) {
    console.error("Update workout set error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to update workout set", 500);
  }
}

// DELETE /api/workout-sets/[id] - Delete workout set
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    // Verify set exists and belongs to user's session
    const existingSet = await prisma.workoutSet.findFirst({
      where: {
        id,
        session: {
          userId: user.id,
        },
      },
    });

    if (!existingSet) {
      return notFoundResponse("Workout set");
    }

    await prisma.workoutSet.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Delete workout set error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to delete workout set", 500);
  }
}
