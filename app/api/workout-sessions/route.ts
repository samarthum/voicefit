import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { createWorkoutSessionSchema, listQuerySchema } from "@/lib/validations";

type SessionWithCount = {
  id: string;
  userId: string;
  title: string;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { sets: number };
};

// GET /api/workout-sessions - List workout sessions
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

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

    // Transform to include set count
    const sessionsWithCount = sessions.map((session: SessionWithCount) => ({
      ...session,
      setCount: session._count.sets,
      _count: undefined,
    }));

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
    const user = await getCurrentUser();

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
