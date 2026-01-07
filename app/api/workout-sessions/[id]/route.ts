import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/api-helpers";
import { updateWorkoutSessionSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workout-sessions/[id] - Get single session with sets
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const session = await prisma.workoutSession.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        sets: {
          orderBy: { performedAt: "asc" },
        },
      },
    });

    if (!session) {
      return notFoundResponse("Workout session");
    }

    return successResponse(session);
  } catch (error) {
    console.error("Get workout session error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to get workout session", 500);
  }
}

// PUT /api/workout-sessions/[id] - Update session (e.g., end it)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingSession) {
      return notFoundResponse("Workout session");
    }

    const body = await request.json();
    const parseResult = updateWorkoutSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const updateData: Record<string, unknown> = {};
    if (parseResult.data.title) {
      updateData.title = parseResult.data.title;
    }
    if (parseResult.data.endedAt) {
      updateData.endedAt = new Date(parseResult.data.endedAt);
    }

    const session = await prisma.workoutSession.update({
      where: { id },
      data: updateData,
    });

    return successResponse(session);
  } catch (error) {
    console.error("Update workout session error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to update workout session", 500);
  }
}

// DELETE /api/workout-sessions/[id] - Delete session and all sets
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingSession) {
      return notFoundResponse("Workout session");
    }

    // Delete session (sets will cascade delete)
    await prisma.workoutSession.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Delete workout session error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to delete workout session", 500);
  }
}
