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

// GET /api/dashboard - Get dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get("timezone") || "UTC";

    // Get today's date string
    const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
    const todayStart = new Date(today + "T00:00:00.000Z");
    const todayEnd = new Date(today + "T23:59:59.999Z");

    // Get last 7 days for trends
    const last7Days = getLastNDays(7, timezone);

    // Fetch all data in parallel
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
      // Today's meals
      prisma.mealLog.findMany({
        where: {
          userId: user.id,
          eatenAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      // Today's metrics
      prisma.dailyMetric.findUnique({
        where: {
          userId_date: { userId: user.id, date: today },
        },
      }),
      // Today's workout sessions
      prisma.workoutSession.findMany({
        where: {
          userId: user.id,
          startedAt: { gte: todayStart, lte: todayEnd },
        },
        include: {
          _count: { select: { sets: true } },
        },
      }),
      // Weekly meals for trends
      prisma.mealLog.findMany({
        where: {
          userId: user.id,
          eatenAt: {
            gte: new Date(last7Days[0] + "T00:00:00.000Z"),
            lte: todayEnd,
          },
        },
        select: { eatenAt: true, calories: true },
      }),
      // Weekly metrics for trends
      prisma.dailyMetric.findMany({
        where: {
          userId: user.id,
          date: { in: last7Days },
        },
      }),
      // Weekly sessions for trends
      prisma.workoutSession.findMany({
        where: {
          userId: user.id,
          startedAt: {
            gte: new Date(last7Days[0] + "T00:00:00.000Z"),
            lte: todayEnd,
          },
        },
        select: { startedAt: true },
      }),
      // Recent meals for quick-add
      prisma.mealLog.findMany({
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
      }),
      // Recent exercises for quick-add
      prisma.workoutSet.findMany({
        where: { session: { userId: user.id } },
        orderBy: { performedAt: "desc" },
        take: 50,
        select: { exerciseName: true },
      }),
    ]);

    // Calculate today's totals
    const todayCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
    const todaySetCount = todaySessions.reduce(
      (sum, session) => sum + session._count.sets,
      0
    );

    // Build weekly trends
    const weeklyTrends = last7Days.map((date) => {
      const dayMeals = weeklyMeals.filter(
        (m) => m.eatenAt.toISOString().split("T")[0] === date
      );
      const dayMetric = weeklyMetrics.find((m) => m.date === date);
      const daySessions = weeklySessions.filter(
        (s) => s.startedAt.toISOString().split("T")[0] === date
      );

      return {
        date,
        calories: dayMeals.reduce((sum, m) => sum + m.calories, 0),
        steps: dayMetric?.steps ?? null,
        weight: dayMetric?.weightKg ?? null,
        workouts: daySessions.length,
      };
    });

    // Deduplicate recent exercises
    const seenExercises = new Set<string>();
    const recentExercises = recentSets
      .filter((set) => {
        const key = set.exerciseName.toLowerCase().trim();
        if (seenExercises.has(key)) return false;
        seenExercises.add(key);
        return true;
      })
      .map((set) => set.exerciseName)
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
      recentMeals: recentMeals.map((meal) => ({
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
