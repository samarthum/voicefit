import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";

// POST /api/workout-sessions/quick - Get or create a quick log session
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get("timezone") ?? undefined;
    const today = timezone
      ? new Date().toLocaleDateString("en-CA", { timeZone: timezone })
      : new Date().toLocaleDateString("en-CA");

    const startOfDay = new Date(today + "T00:00:00.000Z");
    const endOfDay = new Date(today + "T23:59:59.999Z");

    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        userId: user.id,
        startedAt: { gte: startOfDay, lte: endOfDay },
        endedAt: null,
      },
      orderBy: { startedAt: "desc" },
    });

    if (existingSession) {
      return successResponse(existingSession);
    }

    const session = await prisma.workoutSession.create({
      data: {
        userId: user.id,
        title: "Quick Log",
        startedAt: new Date(),
      },
    });

    return successResponse(session, 201);
  } catch (error) {
    console.error("Quick workout session error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to create quick workout session", 500);
  }
}
