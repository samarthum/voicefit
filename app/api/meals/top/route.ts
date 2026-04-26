import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import type { TopMealItem, TopMealsResponse } from "@voicefit/contracts/types";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
  limit: z.coerce.number().int().min(1).max(20).default(4),
});

type MealRow = { description: string; calories: number };

type AggregateEntry = {
  key: string;
  description: string;
  count: number;
  totalCalories: number;
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      days: searchParams.get("days") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return errorResponse("Invalid query parameters", 400);
    }

    const { days, limit } = parsed.data;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const meals = (await prisma.mealLog.findMany({
      where: {
        userId: user.id,
        eatenAt: { gte: since },
      },
      orderBy: { eatenAt: "desc" },
      select: { description: true, calories: true },
    })) as MealRow[];

    const map = new Map<string, AggregateEntry>();
    for (const meal of meals) {
      const key = meal.description.trim().toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.totalCalories += meal.calories;
      } else {
        map.set(key, {
          key,
          description: meal.description,
          count: 1,
          totalCalories: meal.calories,
        });
      }
    }

    const sorted = Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.totalCalories - a.totalCalories;
    });

    const top: TopMealItem[] = sorted.slice(0, limit).map((entry) => ({
      key: entry.key,
      description: entry.description,
      count: entry.count,
      totalCalories: entry.totalCalories,
      averageCalories: Math.round(entry.totalCalories / entry.count),
    }));

    const response: TopMealsResponse = { meals: top, windowDays: days };
    return successResponse(response);
  } catch (error) {
    console.error("Get top meals error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to get top meals", 500);
  }
}
