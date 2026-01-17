import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/api-helpers";
import { createConversationEvent } from "@/lib/conversation-events";
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

    const { sessionId, performedAt, exerciseName, exerciseType, reps, weightKg, durationMinutes, notes, transcriptRaw } =
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
        exerciseType,
        reps,
        weightKg,
        durationMinutes,
        notes,
        transcriptRaw,
      },
    });

    try {
      const userText = transcriptRaw?.trim() || `Added ${exerciseName}`;
      const details: string[] = [];
      if (exerciseType === "cardio") {
        if (durationMinutes !== null && durationMinutes !== undefined) {
          details.push(`${durationMinutes} min`);
        }
      } else {
        if (reps !== null && reps !== undefined) {
          details.push(`${reps} reps`);
        }
        if (weightKg !== null && weightKg !== undefined) {
          details.push(`${weightKg} kg`);
        }
      }
      const detailText = details.length ? ` · ${details.join(" · ")}` : "";

      await createConversationEvent({
        userId: user.id,
        kind: "workout_set",
        userText,
        systemText: `Logged ${exerciseName}${detailText}`,
        source: "text",
        referenceType: "workout_set",
        referenceId: set.id,
        metadata: {
          exerciseName,
          exerciseType,
          reps,
          weightKg,
          durationMinutes,
          notes,
          performedAt: set.performedAt.toISOString(),
          sessionId: session.id,
          sessionTitle: session.title,
          sessionStartedAt: session.startedAt.toISOString(),
          sessionEndedAt: session.endedAt ? session.endedAt.toISOString() : null,
        },
      });
    } catch (error) {
      console.error("Conversation event error (workout set):", error);
    }

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
