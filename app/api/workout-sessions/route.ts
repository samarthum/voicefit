import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { createWorkoutSessionSchema, listQuerySchema } from "@/lib/validations";

type SessionWithSets = {
  id: string;
  userId: string;
  title: string;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { sets: number };
  sets: { reps: number | null; weightKg: number | null }[];
};

// GET /api/workout-sessions - List workout sessions
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    const { searchParams } = new URL(request.url);
    const queryResult = listQuerySchema.safeParse({
      limit: searchParams.get("limit") || 20,
      offset: searchParams.get("offset") || 0,
      date: searchParams.get("date") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });

    if (!queryResult.success) {
      return errorResponse(queryResult.error.issues[0].message);
    }

    const { limit, offset, date, startDate, endDate } = queryResult.data;

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (date) {
      dateFilter.gte = new Date(date + "T00:00:00.000Z");
      dateFilter.lte = new Date(date + "T23:59:59.999Z");
    } else {
      if (startDate) {
        dateFilter.gte = new Date(startDate + "T00:00:00.000Z");
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: user.id,
        ...(Object.keys(dateFilter).length > 0 && { startedAt: dateFilter }),
      },
      include: {
        _count: {
          select: { sets: true },
        },
        sets: {
          select: { reps: true, weightKg: true },
        },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.workoutSession.count({
      where: {
        userId: user.id,
        ...(Object.keys(dateFilter).length > 0 && { startedAt: dateFilter }),
      },
    });

    const allSets = await prisma.workoutSet.findMany({
      where: { session: { userId: user.id }, weightKg: { not: null } },
      select: { id: true, exerciseName: true, performedAt: true, weightKg: true, sessionId: true },
      orderBy: { performedAt: "asc" },
    });

    const runningMax = new Map<string, number>();
    const prCountBySession = new Map<string, number>();
    for (const s of allSets) {
      const w = s.weightKg!;
      const prior = runningMax.get(s.exerciseName);
      if (prior === undefined || w > prior) {
        prCountBySession.set(s.sessionId, (prCountBySession.get(s.sessionId) ?? 0) + 1);
        runningMax.set(s.exerciseName, w);
      }
    }

    const sessionsWithCount = sessions.map((session: SessionWithSets) => {
      const volume = Math.round(
        session.sets.reduce((sum, set) => {
          if (set.reps == null || set.weightKg == null) return sum;
          return sum + set.reps * set.weightKg;
        }, 0),
      );
      return {
        id: session.id,
        userId: session.userId,
        title: session.title,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        setCount: session._count.sets,
        volume,
        prCount: prCountBySession.get(session.id) ?? 0,
      };
    });

    return successResponse({
      sessions: sessionsWithCount,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("List workout sessions error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to list workout sessions", 500);
  }
}

// POST /api/workout-sessions - Create workout session
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    const body = await request.json();
    const parseResult = createWorkoutSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { title, startedAt } = parseResult.data;

    const session = await prisma.workoutSession.create({
      data: {
        userId: user.id,
        title,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
      },
    });

    return successResponse(session, 201);
  } catch (error) {
    console.error("Create workout session error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to create workout session", 500);
  }
}
