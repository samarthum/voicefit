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
type TodayMealMacros = { calories: number; proteinG: number | null; carbsG: number | null; fatG: number | null };
type WeeklyMetric = { date: string; steps: number | null; weightKg: number | null };
type WeeklySession = { startedAt: Date };
type RecentSet = { exerciseName: string };
type RecentSession = { sets: RecentSet[] };
type RecentMeal = { id: string; description: string; calories: number; mealType: string; eatenAt: Date };
type SelectedMeal = RecentMeal & { proteinG: number | null; carbsG: number | null; fatG: number | null };

function attachDashboardTiming(
  response: ReturnType<typeof successResponse<DashboardData>>,
  timing: { authMs: number; dbMs: number; buildMs: number; totalMs: number; scope: string }
) {
  response.headers.set(
    "Server-Timing",
    [
      `auth;dur=${timing.authMs.toFixed(1)}`,
      `db;dur=${timing.dbMs.toFixed(1)}`,
      `build;dur=${timing.buildMs.toFixed(1)}`,
      `total;dur=${timing.totalMs.toFixed(1)}`,
    ].join(", ")
  );
  response.headers.set("X-VoiceFit-Dashboard-Ms", String(Math.round(timing.totalMs)));
  response.headers.set("X-VoiceFit-Dashboard-Scope", timing.scope);
  return response;
}

// GET /api/dashboard - Get dashboard data
export async function GET(request: NextRequest) {
  const routeStart = performance.now();
  let authMs = 0;
  let dbMs = 0;
  let buildMs = 0;

  try {
    const authStart = performance.now();
    const user = await getCurrentUser(request);
    authMs = performance.now() - authStart;

    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get("timezone") || "UTC";
    const dateParam = searchParams.get("date"); // Optional date parameter (YYYY-MM-DD format)
    const scope = searchParams.get("scope") === "home" ? "home" : "full";

    // Get the actual current date (for weekly trends)
    const actualToday = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
    const actualTodayEnd = new Date(actualToday + "T23:59:59.999Z");

    // Get the selected date (for summary card, defaults to actual today)
    const selectedDate = dateParam || actualToday;
    const selectedDateStart = new Date(selectedDate + "T00:00:00.000Z");
    const selectedDateEnd = new Date(selectedDate + "T23:59:59.999Z");

    if (scope === "home") {
      const dbStart = performance.now();
      const selectedMealsPromise = prisma.mealLog.findMany({
        where: {
          userId: user.id,
          eatenAt: { gte: selectedDateStart, lte: selectedDateEnd },
        },
        orderBy: { eatenAt: "desc" },
        select: {
          id: true,
          description: true,
          calories: true,
          mealType: true,
          eatenAt: true,
          proteinG: true,
          carbsG: true,
          fatG: true,
        },
      });

      const todayMetricPromise = prisma.dailyMetric.findUnique({
        where: {
          userId_date: { userId: user.id, date: selectedDate },
        },
      });

      const [selectedMeals, todayMetric] = await Promise.all([
        selectedMealsPromise,
        todayMetricPromise,
      ]);
      dbMs = performance.now() - dbStart;

      const buildStart = performance.now();
      let todayCalories = 0;
      let todayProtein = 0;
      let todayCarbs = 0;
      let todayFat = 0;
      let anyMacroLogged = false;
      for (const meal of selectedMeals as SelectedMeal[]) {
        todayCalories += meal.calories;
        if (meal.proteinG != null) {
          todayProtein += meal.proteinG;
          anyMacroLogged = true;
        }
        if (meal.carbsG != null) {
          todayCarbs += meal.carbsG;
          anyMacroLogged = true;
        }
        if (meal.fatG != null) {
          todayFat += meal.fatG;
          anyMacroLogged = true;
        }
      }

      const dashboardData: DashboardData = {
        today: {
          calories: {
            consumed: todayCalories,
            goal: user.calorieGoal,
          },
          macros: anyMacroLogged
            ? {
                protein: Math.round(todayProtein),
                carbs: Math.round(todayCarbs),
                fat: Math.round(todayFat),
              }
            : null,
          proteinGoal: user.proteinGoal,
          steps: {
            count: todayMetric?.steps ?? null,
            goal: user.stepGoal,
          },
          weight: todayMetric?.weightKg ?? null,
          workoutSessions: 0,
          workoutSets: 0,
        },
        weeklyTrends: [],
        recentMeals: (selectedMeals as SelectedMeal[]).map((meal) => ({
          id: meal.id,
          description: meal.description,
          calories: meal.calories,
          mealType: meal.mealType,
          eatenAt: meal.eatenAt.toISOString(),
        })),
        recentExercises: [],
      };

      buildMs = performance.now() - buildStart;
      const totalMs = performance.now() - routeStart;
      const response = attachDashboardTiming(successResponse(dashboardData), {
        authMs,
        dbMs,
        buildMs,
        totalMs,
        scope,
      });

      if (totalMs > 1000) {
        console.info(
          `Slow dashboard request: scope=${scope} total=${Math.round(totalMs)}ms auth=${Math.round(authMs)}ms db=${Math.round(dbMs)}ms build=${Math.round(buildMs)}ms`
        );
      }

      return response;
    }

    // Get last 8 days for trends (includes today plus 7 previous days)
    const last8Days = getLastNDays(8, timezone);

    // Fetch all data in parallel
    const dbStart = performance.now();
    const todayMealsPromise = prisma.mealLog.findMany({
      where: {
        userId: user.id,
        eatenAt: { gte: selectedDateStart, lte: selectedDateEnd },
      },
      select: {
        calories: true,
        proteinG: true,
        carbsG: true,
        fatG: true,
      },
    });

    const todayMetricPromise = prisma.dailyMetric.findUnique({
      where: {
        userId_date: { userId: user.id, date: selectedDate },
      },
    });

    const todaySessionsPromise = prisma.workoutSession.findMany({
      where: {
        userId: user.id,
        startedAt: { gte: selectedDateStart, lte: selectedDateEnd },
      },
      include: {
        _count: { select: { sets: true } },
      },
    });

    const weeklyMealsPromise = prisma.mealLog.findMany({
      where: {
        userId: user.id,
        eatenAt: {
          gte: new Date(last8Days[0] + "T00:00:00.000Z"),
          lte: actualTodayEnd,
        },
      },
      select: { eatenAt: true, calories: true },
    });

    const weeklyMetricsPromise = prisma.dailyMetric.findMany({
      where: {
        userId: user.id,
        date: { in: last8Days },
      },
    });

    const weeklySessionsPromise = prisma.workoutSession.findMany({
      where: {
        userId: user.id,
        startedAt: {
          gte: new Date(last8Days[0] + "T00:00:00.000Z"),
          lte: actualTodayEnd,
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

    const recentSessionsPromise = prisma.workoutSession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        sets: {
          orderBy: { performedAt: "desc" },
          select: { exerciseName: true },
        },
      },
    });

    const [
      todayMeals,
      todayMetric,
      todaySessions,
      weeklyMeals,
      weeklyMetrics,
      weeklySessions,
      recentMeals,
      recentSessions,
    ] = await Promise.all([
      todayMealsPromise,
      todayMetricPromise,
      todaySessionsPromise,
      weeklyMealsPromise,
      weeklyMetricsPromise,
      weeklySessionsPromise,
      recentMealsPromise,
      recentSessionsPromise,
    ]);
    dbMs = performance.now() - dbStart;
    const buildStart = performance.now();

    // Calculate today's totals
    let todayCalories = 0;
    let todayProtein = 0;
    let todayCarbs = 0;
    let todayFat = 0;
    let anyMacroLogged = false;
    for (const meal of todayMeals as TodayMealMacros[]) {
      todayCalories += meal.calories;
      if (meal.proteinG != null) {
        todayProtein += meal.proteinG;
        anyMacroLogged = true;
      }
      if (meal.carbsG != null) {
        todayCarbs += meal.carbsG;
        anyMacroLogged = true;
      }
      if (meal.fatG != null) {
        todayFat += meal.fatG;
        anyMacroLogged = true;
      }
    }
    let todaySetCount = 0;
    for (const session of todaySessions) {
      todaySetCount += session._count.sets;
    }

    // Build weekly trends
    const weeklyTrends = last8Days.map((date: string) => {
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
    const recentSets = (recentSessions as RecentSession[]).flatMap((session) => session.sets);
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
        macros: anyMacroLogged
          ? {
              protein: Math.round(todayProtein),
              carbs: Math.round(todayCarbs),
              fat: Math.round(todayFat),
            }
          : null,
        proteinGoal: user.proteinGoal,
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

    buildMs = performance.now() - buildStart;
    const totalMs = performance.now() - routeStart;
    const response = attachDashboardTiming(successResponse(dashboardData), {
      authMs,
      dbMs,
      buildMs,
      totalMs,
      scope,
    });

    if (totalMs > 1000) {
      console.info(
        `Slow dashboard request: scope=${scope} total=${Math.round(totalMs)}ms auth=${Math.round(authMs)}ms db=${Math.round(dbMs)}ms build=${Math.round(buildMs)}ms`
      );
    }

    return response;
  } catch (error) {
    console.error("Get dashboard error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to get dashboard data", 500);
  }
}
