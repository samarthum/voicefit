import { prisma } from "@/lib/db";
import { getEndOfDay, getLastNDays, getStartOfDay } from "@/lib/timezone";

export interface AssistantRange {
  days: number;
  dates: string[];
  start: string;
  end: string;
}

export interface AssistantDataSnapshot {
  meals: Array<{
    eatenAt: Date;
    mealType: string;
    description: string;
    calories: number;
  }>;
  metrics: Array<{
    date: string;
    steps: number | null;
    weightKg: number | null;
  }>;
  workouts: Array<{
    startedAt: Date;
    title: string;
    setCount: number;
    sets: Array<{
      exerciseName: string;
      reps: number | null;
      weightKg: number | null;
      durationMinutes: number | null;
    }>;
  }>;
}

export function getRange(days: number, timezone?: string): AssistantRange {
  const dates = getLastNDays(days, timezone);
  return {
    days,
    dates,
    start: dates[0],
    end: dates[dates.length - 1],
  };
}

export function getPreviousRange(
  currentRange: AssistantRange,
  timezone?: string
): AssistantRange {
  const startDate = new Date(currentRange.start + "T00:00:00");
  const previousDates: string[] = [];

  for (let i = currentRange.days; i > 0; i -= 1) {
    const date = new Date(startDate);
    date.setDate(date.getDate() - i);
    previousDates.push(
      timezone
        ? date.toLocaleDateString("en-CA", { timeZone: timezone })
        : date.toISOString().split("T")[0]
    );
  }

  return {
    days: currentRange.days,
    dates: previousDates,
    start: previousDates[0],
    end: previousDates[previousDates.length - 1],
  };
}

export async function getAssistantData(
  userId: string,
  range: AssistantRange
): Promise<AssistantDataSnapshot> {
  const startDate = getStartOfDay(range.start);
  const endDate = getEndOfDay(range.end);

  const [meals, metrics, sessions] = await Promise.all([
    prisma.mealLog.findMany({
      where: {
        userId,
        eatenAt: { gte: startDate, lte: endDate },
      },
      orderBy: { eatenAt: "desc" },
      select: {
        eatenAt: true,
        mealType: true,
        description: true,
        calories: true,
      },
    }),
    prisma.dailyMetric.findMany({
      where: {
        userId,
        date: { in: range.dates },
      },
      orderBy: { date: "asc" },
      select: {
        date: true,
        steps: true,
        weightKg: true,
      },
    }),
    prisma.workoutSession.findMany({
      where: {
        userId,
        startedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { startedAt: "desc" },
      include: {
        sets: {
          select: {
            exerciseName: true,
            reps: true,
            weightKg: true,
            durationMinutes: true,
          },
        },
        _count: { select: { sets: true } },
      },
    }),
  ]);

  return {
    meals,
    metrics,
    workouts: sessions.map((session) => ({
      startedAt: session.startedAt,
      title: session.title,
      setCount: session._count.sets,
      sets: session.sets,
    })),
  };
}
