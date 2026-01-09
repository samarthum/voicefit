import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { getLastNDays } from "@/lib/timezone";
import type { DashboardData } from "@/lib/types";

// Types for query results
type WeeklyMeal = { eatenAt: Date; calories: number };
type WeeklyMetric = { date: string; steps: number | null; weightKg: number | null };
type WeeklySession = { startedAt: Date };
type RecentSet = { exerciseName: string };
type RecentMeal = { id: string; description: string; calories: number; mealType: string; eatenAt: Date };

// GET /api/dashboard - Get dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get("timezone") || "UTC";
    const dateParam = searchParams.get("date"); // Optional date parameter (YYYY-MM-DD format)

    // Get the target date string (use provided date or today)
    const today = dateParam || new Date().toLocaleDateString("en-CA", { timeZone: timezone });
    const todayStart = new Date(today + "T00:00:00.000Z");
    const todayEnd = new Date(today + "T23:59:59.999Z");

    // Get last 7 days for trends
    const last7Days = getLastNDays(7, timezone);

    // Fetch all data in parallel
    const todayMealsPromise = prisma.mealLog.findMany({
      where: {
        userId: user.id,
        eatenAt: { gte: todayStart, lte: todayEnd },
      },
    });

    const todayMetricPromise = prisma.dailyMetric.findUnique({
      where: {
        userId_date: { userId: user.id, date: today },
      },
    });

    const todaySessionsPromise = prisma.workoutSession.findMany({
      where: {
        userId: user.id,
        startedAt: { gte: todayStart, lte: todayEnd },
      },
      include: {
        _count: { select: { sets: true } },
      },
    });

    const weeklyMealsPromise = prisma.mealLog.findMany({
      where: {
        userId: user.id,
        eatenAt: {
          gte: new Date(last7Days[0] + "T00:00:00.000Z"),
          lte: todayEnd,
        },
      },
      select: { eatenAt: true, calories: true },
    });

    const weeklyMetricsPromise = prisma.dailyMetric.findMany({
      where: {
        userId: user.id,
        date: { in: last7Days },
      },
    });

    const weeklySessionsPromise = prisma.workoutSession.findMany({
      where: {
        userId: user.id,
        startedAt: {
          gte: new Date(last7Days[0] + "T00:00:00.000Z"),
          lte: todayEnd,
        },
      },
      select: { startedAt: true },
    });

    const recentMealsPromise = prisma.mealLog.findMany({
      where: { userId: user.id },
      orderBy: { eatenAt: "desc" },
      take: 5,
      select: {
        id: true,
        description: true,
        calories: true,
        mealType: true,
        eatenAt: true,
      },
    });

    const recentSetsPromise = prisma.workoutSet.findMany({
      where: { session: { userId: user.id } },
      orderBy: { performedAt: "desc" },
      take: 50,
      select: { exerciseName: true },
    });

    const [
      todayMeals,
      todayMetric,
      todaySessions,
      weeklyMeals,
      weeklyMetrics,
      weeklySessions,
      recentMeals,
      recentSets,
    ] = await Promise.all([
      todayMealsPromise,
      todayMetricPromise,
      todaySessionsPromise,
      weeklyMealsPromise,
      weeklyMetricsPromise,
      weeklySessionsPromise,
      recentMealsPromise,
      recentSetsPromise,
    ]);

    // Calculate today's totals
    let todayCalories = 0;
    for (const meal of todayMeals) {
      todayCalories += meal.calories;
    }
    let todaySetCount = 0;
    for (const session of todaySessions) {
      todaySetCount += session._count.sets;
    }

    // Build weekly trends
    const weeklyTrends = last7Days.map((date: string) => {
      const dayMeals = weeklyMeals.filter(
        (m: WeeklyMeal) => m.eatenAt.toISOString().split("T")[0] === date
      );
      const dayMetric = weeklyMetrics.find((m: WeeklyMetric) => m.date === date);
      const daySessions = weeklySessions.filter(
        (s: WeeklySession) => s.startedAt.toISOString().split("T")[0] === date
      );

      let dayCalories = 0;
      for (const m of dayMeals) {
        dayCalories += m.calories;
      }

      return {
        date,
        calories: dayCalories,
        steps: dayMetric?.steps ?? null,
        weight: dayMetric?.weightKg ?? null,
        workouts: daySessions.length,
      };
    });

    // Deduplicate recent exercises
    const seenExercises = new Set<string>();
    const recentExercises = recentSets
      .filter((set: RecentSet) => {
        const key = set.exerciseName.toLowerCase().trim();
        if (seenExercises.has(key)) return false;
        seenExercises.add(key);
        return true;
      })
      .map((set: RecentSet) => set.exerciseName)
      .slice(0, 10);

    const dashboardData: DashboardData = {
      today: {
        calories: {
          consumed: todayCalories,
          goal: user.calorieGoal,
        },
        steps: {
          count: todayMetric?.steps ?? null,
          goal: user.stepGoal,
        },
        weight: todayMetric?.weightKg ?? null,
        workoutSessions: todaySessions.length,
        workoutSets: todaySetCount,
      },
      weeklyTrends,
      recentMeals: recentMeals.map((meal: RecentMeal) => ({
        id: meal.id,
        description: meal.description,
        calories: meal.calories,
        mealType: meal.mealType,
        eatenAt: meal.eatenAt.toISOString(),
      })),
      recentExercises,
    };

    return successResponse(dashboardData);
  } catch (error) {
    console.error("Get dashboard error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to get dashboard data", 500);
  }
}
