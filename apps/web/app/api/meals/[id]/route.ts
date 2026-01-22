import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/api-helpers";
import { updateMealSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/meals/[id] - Get single meal
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const meal = await prisma.mealLog.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!meal) {
      return notFoundResponse("Meal");
    }

    return successResponse(meal);
  } catch (error) {
    console.error("Get meal error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to get meal", 500);
  }
}

// PUT /api/meals/[id] - Update meal
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    // Check if meal exists and belongs to user
    const existingMeal = await prisma.mealLog.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingMeal) {
      return notFoundResponse("Meal");
    }

    const body = await request.json();
    const parseResult = updateMealSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const updateData: Record<string, unknown> = {};
    if (parseResult.data.eatenAt) {
      updateData.eatenAt = new Date(parseResult.data.eatenAt);
    }
    if (parseResult.data.mealType) {
      updateData.mealType = parseResult.data.mealType;
    }
    if (parseResult.data.description) {
      updateData.description = parseResult.data.description;
    }
    if (parseResult.data.calories !== undefined) {
      updateData.calories = parseResult.data.calories;
    }

    const meal = await prisma.mealLog.update({
      where: { id },
      data: updateData,
    });

    return successResponse(meal);
  } catch (error) {
    console.error("Update meal error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to update meal", 500);
  }
}

// DELETE /api/meals/[id] - Delete meal
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    // Check if meal exists and belongs to user
    const existingMeal = await prisma.mealLog.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingMeal) {
      return notFoundResponse("Meal");
    }

    await prisma.mealLog.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Delete meal error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to delete meal", 500);
  }
}
