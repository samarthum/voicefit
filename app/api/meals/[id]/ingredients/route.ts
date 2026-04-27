import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/api-helpers";
import { mealIngredientSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const replaceIngredientsSchema = z.object({
  ingredients: z.array(mealIngredientSchema),
});

// PUT /api/meals/[id]/ingredients - Replace ingredient list and recompute totals server-side
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(request);
    const { id } = await params;

    const body = await request.json();
    const parseResult = replaceIngredientsSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { ingredients } = parseResult.data;

    const calories = Math.round(
      ingredients.reduce((sum, row) => sum + row.calories, 0)
    );
    const proteinG = Math.round(
      ingredients.reduce((sum, row) => sum + row.proteinG, 0)
    );
    const carbsG = Math.round(
      ingredients.reduce((sum, row) => sum + row.carbsG, 0)
    );
    const fatG = Math.round(
      ingredients.reduce((sum, row) => sum + row.fatG, 0)
    );

    const meal = await prisma.$transaction(async (tx) => {
      const existing = await tx.mealLog.findFirst({
        where: { id, userId: user.id },
        select: { id: true },
      });

      if (!existing) {
        return null;
      }

      await tx.mealIngredient.deleteMany({
        where: { mealLogId: id },
      });

      return tx.mealLog.update({
        where: { id },
        data: {
          calories,
          proteinG,
          carbsG,
          fatG,
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
    });

    if (!meal) {
      return notFoundResponse("Meal");
    }

    return successResponse(meal);
  } catch (error) {
    console.error("Replace meal ingredients error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to replace meal ingredients", 500);
  }
}
