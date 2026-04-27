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
    const user = await getCurrentUser(request);
    const { id } = await params;

    const meal = await prisma.mealLog.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        ingredients: {
          orderBy: { position: "asc" },
        },
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
    const user = await getCurrentUser(request);
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
    if (parseResult.data.proteinG !== undefined) {
      updateData.proteinG = parseResult.data.proteinG;
    }
    if (parseResult.data.carbsG !== undefined) {
      updateData.carbsG = parseResult.data.carbsG;
    }
    if (parseResult.data.fatG !== undefined) {
      updateData.fatG = parseResult.data.fatG;
    }

    const ingredients = parseResult.data.ingredients;

    // If ingredients provided: replace the entire list atomically.
    // If ingredients omitted: leave existing ingredient rows untouched.
    const meal = ingredients !== undefined
      ? await prisma.$transaction(async (tx) => {
          await tx.mealIngredient.deleteMany({
            where: { mealLogId: id },
          });
          return tx.mealLog.update({
            where: { id },
            data: {
              ...updateData,
              ingredients: {
                create: ingredients.map((ingredient, index) => ({
                  position: index,
                  name: ingredient.name,
                  grams: ingredient.grams,
                  calories: ingredient.calories,
                  proteinG: ingredient.proteinG,
                  carbsG: ingredient.carbsG,
                  fatG: ingredient.fatG,
                })),
              },
            },
            include: {
              ingredients: {
                orderBy: { position: "asc" },
              },
            },
          });
        })
      : await prisma.mealLog.update({
          where: { id },
          data: updateData,
          include: {
            ingredients: {
              orderBy: { position: "asc" },
            },
          },
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
    const user = await getCurrentUser(request);
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
