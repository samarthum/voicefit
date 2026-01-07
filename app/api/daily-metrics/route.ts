import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { upsertDailyMetricsSchema, listQuerySchema } from "@/lib/validations";

// GET /api/daily-metrics - List daily metrics
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const { searchParams } = new URL(request.url);
    const queryResult = listQuerySchema.safeParse({
      limit: searchParams.get("limit") || 30,
      offset: searchParams.get("offset") || 0,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });

    if (!queryResult.success) {
      return errorResponse(queryResult.error.issues[0].message);
    }

    const { limit, offset, startDate, endDate } = queryResult.data;

    // Build date filter for string dates
    const dateFilter: { gte?: string; lte?: string } = {};
    if (startDate) {
      dateFilter.gte = startDate;
    }
    if (endDate) {
      dateFilter.lte = endDate;
    }

    const metrics = await prisma.dailyMetric.findMany({
      where: {
        userId: user.id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    });

    return successResponse(metrics);
  } catch (error) {
    console.error("List daily metrics error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to list daily metrics", 500);
  }
}

// POST /api/daily-metrics - Upsert daily metrics
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const body = await request.json();
    const parseResult = upsertDailyMetricsSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { date, steps, weightKg } = parseResult.data;

    const metric = await prisma.dailyMetric.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date,
        },
      },
      create: {
        userId: user.id,
        date,
        steps,
        weightKg,
      },
      update: {
        ...(steps !== undefined && { steps }),
        ...(weightKg !== undefined && { weightKg }),
      },
    });

    return successResponse(metric);
  } catch (error) {
    console.error("Upsert daily metrics error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to update daily metrics", 500);
  }
}
