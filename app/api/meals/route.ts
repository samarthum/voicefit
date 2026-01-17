import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { createConversationEvent } from "@/lib/conversation-events";
import { createMealSchema, listQuerySchema } from "@/lib/validations";

// GET /api/meals - List meals
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawParams = {
      limit: searchParams.get("limit") || 20,
      offset: searchParams.get("offset") || 0,
      date: searchParams.get("date") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    };

    const queryResult = listQuerySchema.safeParse(rawParams);

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

    const meals = await prisma.mealLog.findMany({
      where: {
        userId: user.id,
        ...(Object.keys(dateFilter).length > 0 && { eatenAt: dateFilter }),
      },
      orderBy: { eatenAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.mealLog.count({
      where: {
        userId: user.id,
        ...(Object.keys(dateFilter).length > 0 && { eatenAt: dateFilter }),
      },
    });

    return successResponse({
      meals,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("List meals error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to list meals", 500);
  }
}

// POST /api/meals - Create meal
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const body = await request.json();
    const parseResult = createMealSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { eatenAt, mealType, description, calories, transcriptRaw } = parseResult.data;

    const meal = await prisma.mealLog.create({
      data: {
        userId: user.id,
        eatenAt: new Date(eatenAt),
        mealType,
        description,
        calories,
        transcriptRaw,
      },
    });

    try {
      const userText = transcriptRaw?.trim() || description;
      await createConversationEvent({
        userId: user.id,
        kind: "meal",
        userText,
        systemText: `Logged ${description} · ${calories} kcal`,
        source: "text",
        referenceType: "meal",
        referenceId: meal.id,
        metadata: {
          mealType,
          description,
          calories,
          eatenAt: meal.eatenAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("Conversation event error (meal):", error);
    }

    return successResponse(meal, 201);
  } catch (error) {
    console.error("Create meal error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to create meal", 500);
  }
}
