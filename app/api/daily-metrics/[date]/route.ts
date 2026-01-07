import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/api-helpers";
import { upsertDailyMetricsSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ date: string }>;
}

// GET /api/daily-metrics/[date] - Get metrics for a specific date
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { date } = await params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse("Invalid date format. Use YYYY-MM-DD.");
    }

    const metric = await prisma.dailyMetric.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date,
        },
      },
    });

    if (!metric) {
      // Return empty data for the date instead of 404
      return successResponse({
        date,
        steps: null,
        weightKg: null,
      });
    }

    return successResponse(metric);
  } catch (error) {
    console.error("Get daily metrics error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to get daily metrics", 500);
  }
}

// PUT /api/daily-metrics/[date] - Update metrics for a specific date
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { date } = await params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse("Invalid date format. Use YYYY-MM-DD.");
    }

    const body = await request.json();
    const parseResult = upsertDailyMetricsSchema.safeParse({ ...body, date });

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { steps, weightKg } = parseResult.data;

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
    console.error("Update daily metrics error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to update daily metrics", 500);
  }
}

// DELETE /api/daily-metrics/[date] - Delete metrics for a specific date
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { date } = await params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse("Invalid date format. Use YYYY-MM-DD.");
    }

    const existingMetric = await prisma.dailyMetric.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date,
        },
      },
    });

    if (!existingMetric) {
      return notFoundResponse("Daily metrics");
    }

    await prisma.dailyMetric.delete({
      where: {
        userId_date: {
          userId: user.id,
          date,
        },
      },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Delete daily metrics error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to delete daily metrics", 500);
  }
}
