import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/api-helpers";
import { createWorkoutSetSchema } from "@/lib/validations";

type RecentSet = { exerciseName: string };

// POST /api/workout-sets - Create workout set
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const body = await request.json();
    const parseResult = createWorkoutSetSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { sessionId, performedAt, exerciseName, reps, weightKg, notes, transcriptRaw } =
      parseResult.data;

    // Verify session exists and belongs to user
    const session = await prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
      },
    });

    if (!session) {
      return notFoundResponse("Workout session");
    }

    // Check if session is already ended
    if (session.endedAt) {
      return errorResponse("Cannot add sets to an ended workout session");
    }

    const set = await prisma.workoutSet.create({
      data: {
        sessionId,
        performedAt: performedAt ? new Date(performedAt) : new Date(),
        exerciseName,
        reps,
        weightKg,
        notes,
        transcriptRaw,
      },
    });

    return successResponse(set, 201);
  } catch (error) {
    console.error("Create workout set error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to create workout set", 500);
  }
}

// GET /api/workout-sets - Get recent unique exercises for quick-add
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);

    // Get recent sets to extract unique exercises
    const recentSets = await prisma.workoutSet.findMany({
      where: {
        session: {
          userId: user.id,
        },
      },
      orderBy: { performedAt: "desc" },
      take: 100,
      select: {
        exerciseName: true,
      },
    });

    // Deduplicate exercise names (case-insensitive)
    const seen = new Set<string>();
    const uniqueExercises = recentSets
      .filter((set: RecentSet) => {
        const key = set.exerciseName.toLowerCase().trim();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .map((set: RecentSet) => set.exerciseName)
      .slice(0, limit);

    return successResponse(uniqueExercises);
  } catch (error) {
    console.error("Get recent exercises error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to get recent exercises", 500);
  }
}
