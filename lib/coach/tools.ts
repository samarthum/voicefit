import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeExerciseName } from "@/lib/exercises";

function dateRange(start: string, end: string): { gte: Date; lte: Date } {
  return {
    gte: new Date(start + "T00:00:00.000Z"),
    lte: new Date(end + "T23:59:59.999Z"),
  };
}

// Week-start = Monday. Returns YYYY-MM-DD for the Monday of the week containing `date`.
function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun,1=Mon,...6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

const labelField = z
  .string()
  .describe(
    "One-line user-facing description of what this query is for, e.g. 'Pulling your squat sets from the last 8 weeks'"
  );

/**
 * Creates the full set of coach tools, scoped to a specific user.
 * The userId closure ensures executors can't be tricked into querying other users' data.
 */
export function coachTools(userId: string) {
  return {
    // -----------------------------------------------------------------------
    // 5.1 Domain query tools
    // -----------------------------------------------------------------------

    query_meals: tool({
      description:
        "Search the user's meal log. Returns meals with calories and macros for a date range.",
      inputSchema: z.object({
        label: labelField,
        start_date: z.string().describe("Start date YYYY-MM-DD inclusive"),
        end_date: z.string().describe("End date YYYY-MM-DD inclusive"),
        meal_type: z
          .enum(["breakfast", "lunch", "dinner", "snack"])
          .optional()
          .describe("Filter by meal type"),
        limit: z.number().int().min(1).max(200).default(50),
      }),
      execute: async ({ start_date, end_date, meal_type, limit }) => {
        const meals = await prisma.mealLog.findMany({
          where: {
            userId,
            eatenAt: dateRange(start_date, end_date),
            interpretationStatus: { in: ["needs_review", "reviewed"] },
            calories: { not: null },
            ...(meal_type ? { mealType: meal_type } : {}),
          },
          orderBy: { eatenAt: "desc" },
          take: limit,
          select: {
            id: true,
            eatenAt: true,
            mealType: true,
            description: true,
            calories: true,
            proteinG: true,
            carbsG: true,
            fatG: true,
          },
        });
        return meals.map((m) => ({
          ...m,
          calories: m.calories ?? 0,
          eatenAt: m.eatenAt.toISOString(),
        }));
      },
    }),

    query_workout_sessions: tool({
      description:
        "List the user's workout sessions with a summary of exercises performed.",
      inputSchema: z.object({
        label: labelField,
        start_date: z.string().describe("Start date YYYY-MM-DD inclusive"),
        end_date: z.string().describe("End date YYYY-MM-DD inclusive"),
        limit: z.number().int().min(1).max(100).default(20),
      }),
      execute: async ({ start_date, end_date, limit }) => {
        const sessions = await prisma.workoutSession.findMany({
          where: {
            userId,
            startedAt: dateRange(start_date, end_date),
          },
          orderBy: { startedAt: "desc" },
          take: limit,
          include: {
            sets: {
              select: { exerciseName: true },
            },
          },
        });
        return sessions.map((s) => ({
          id: s.id,
          startedAt: s.startedAt.toISOString(),
          endedAt: s.endedAt?.toISOString() ?? null,
          title: s.title,
          exerciseNotes: s.exerciseNotes,
          setCount: s.sets.length,
          exercises: [...new Set(s.sets.map((set) => set.exerciseName))],
        }));
      },
    }),

    query_workout_sets: tool({
      description:
        "Fetch individual workout sets — the core of progression analysis. Can filter by exercise name (fuzzy-matched) or session.",
      inputSchema: z.object({
        label: labelField,
        start_date: z.string().describe("Start date YYYY-MM-DD inclusive"),
        end_date: z.string().describe("End date YYYY-MM-DD inclusive"),
        exercise_name: z
          .string()
          .optional()
          .describe("Exercise name (fuzzy-matched, e.g. 'squat' matches 'Squat')"),
        session_id: z.string().optional().describe("Filter to a specific session"),
        limit: z.number().int().min(1).max(500).default(200),
      }),
      execute: async ({ start_date, end_date, exercise_name, session_id, limit }) => {
        const canonical = exercise_name
          ? normalizeExerciseName(exercise_name)
          : undefined;

        const sets = await prisma.workoutSet.findMany({
          where: {
            session: { userId },
            performedAt: dateRange(start_date, end_date),
            ...(canonical ? { exerciseName: canonical } : {}),
            ...(session_id ? { sessionId: session_id } : {}),
          },
          orderBy: { performedAt: "desc" },
          take: limit,
          select: {
            id: true,
            sessionId: true,
            performedAt: true,
            exerciseName: true,
            exerciseType: true,
            reps: true,
            weightKg: true,
            durationMinutes: true,
          },
        });
        return sets.map((s) => ({
          ...s,
          performedAt: s.performedAt.toISOString(),
        }));
      },
    }),

    query_metrics: tool({
      description: "Fetch daily step counts and weight measurements for a date range.",
      inputSchema: z.object({
        label: labelField,
        start_date: z.string().describe("Start date YYYY-MM-DD inclusive"),
        end_date: z.string().describe("End date YYYY-MM-DD inclusive"),
      }),
      execute: async ({ start_date, end_date }) => {
        return prisma.dailyMetric.findMany({
          where: {
            userId,
            date: { gte: start_date, lte: end_date },
          },
          orderBy: { date: "asc" },
          select: {
            date: true,
            steps: true,
            weightKg: true,
          },
        });
      },
    }),

    // -----------------------------------------------------------------------
    // 5.2 Analysis helpers
    // -----------------------------------------------------------------------

    compare_periods: tool({
      description:
        "Compare a metric across two date ranges. Returns totals, delta, and percent change.",
      inputSchema: z.object({
        label: labelField,
        metric: z.enum([
          "calories",
          "protein",
          "steps",
          "weight_avg",
          "workout_count",
          "training_volume_kg",
        ]),
        range_a: z.object({
          start: z.string(),
          end: z.string(),
        }),
        range_b: z.object({
          start: z.string(),
          end: z.string(),
        }),
      }),
      execute: async ({ metric, range_a, range_b }) => {
        async function compute(start: string, end: string): Promise<number> {
          switch (metric) {
            case "calories": {
              const result = await prisma.mealLog.aggregate({
                where: {
                  userId,
                  eatenAt: dateRange(start, end),
                  interpretationStatus: { in: ["needs_review", "reviewed"] },
                  calories: { not: null },
                },
                _sum: { calories: true },
              });
              return result._sum.calories ?? 0;
            }
            case "protein": {
              const result = await prisma.mealLog.aggregate({
                where: {
                  userId,
                  eatenAt: dateRange(start, end),
                  interpretationStatus: { in: ["needs_review", "reviewed"] },
                  calories: { not: null },
                },
                _sum: { proteinG: true },
              });
              return result._sum.proteinG ?? 0;
            }
            case "steps": {
              const result = await prisma.dailyMetric.aggregate({
                where: { userId, date: { gte: start, lte: end } },
                _sum: { steps: true },
              });
              return result._sum.steps ?? 0;
            }
            case "weight_avg": {
              const result = await prisma.dailyMetric.aggregate({
                where: { userId, date: { gte: start, lte: end }, weightKg: { not: null } },
                _avg: { weightKg: true },
              });
              return result._avg.weightKg ?? 0;
            }
            case "workout_count": {
              return prisma.workoutSession.count({
                where: { userId, startedAt: dateRange(start, end) },
              });
            }
            case "training_volume_kg": {
              const sets = await prisma.workoutSet.findMany({
                where: {
                  session: { userId },
                  performedAt: dateRange(start, end),
                  weightKg: { not: null },
                  reps: { not: null },
                },
                select: { weightKg: true, reps: true },
              });
              return sets.reduce(
                (sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0),
                0
              );
            }
          }
        }

        const [a, b] = await Promise.all([
          compute(range_a.start, range_a.end),
          compute(range_b.start, range_b.end),
        ]);
        const delta = a - b;
        const percent_change = b !== 0 ? (delta / b) * 100 : 0;

        return {
          a: Math.round(a * 100) / 100,
          b: Math.round(b * 100) / 100,
          delta: Math.round(delta * 100) / 100,
          percent_change: Math.round(percent_change * 10) / 10,
        };
      },
    }),

    workout_consistency: tool({
      description:
        "Analyze workout adherence: workouts per week, streaks, and gaps over the last N weeks.",
      inputSchema: z.object({
        label: labelField,
        weeks: z.number().int().min(1).max(26).describe("Number of weeks to look back"),
      }),
      execute: async ({ weeks }) => {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setUTCDate(startDate.getUTCDate() - weeks * 7);
        const startStr = startDate.toISOString().slice(0, 10);
        const endStr = now.toISOString().slice(0, 10);

        const sessions = await prisma.workoutSession.findMany({
          where: {
            userId,
            startedAt: dateRange(startStr, endStr),
          },
          select: { startedAt: true },
          orderBy: { startedAt: "asc" },
        });

        // Build weekly breakdown
        const weekMap = new Map<string, number>();
        for (let i = 0; i < weeks; i++) {
          const d = new Date(now);
          d.setUTCDate(d.getUTCDate() - i * 7);
          weekMap.set(mondayOf(d), 0);
        }
        for (const s of sessions) {
          const key = mondayOf(s.startedAt);
          weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
        }

        const breakdown = [...weekMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([week_start, count]) => ({ week_start, count }));

        const weeksWithWorkouts = breakdown.filter((w) => w.count > 0).length;

        // Streaks (consecutive weeks with at least one workout)
        let currentStreak = 0;
        let longestStreak = 0;
        let streak = 0;
        for (const w of breakdown) {
          if (w.count > 0) {
            streak++;
            longestStreak = Math.max(longestStreak, streak);
          } else {
            streak = 0;
          }
        }
        // current streak = streak at the end of the array
        currentStreak = streak;

        return {
          weeks_with_workouts: weeksWithWorkouts,
          total_weeks: weeks,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          weekly_breakdown: breakdown,
        };
      },
    }),

    exercise_progression: tool({
      description:
        "Per-lift trend: top set weight, reps, and total volume per week for a named exercise.",
      inputSchema: z.object({
        label: labelField,
        exercise_name: z.string().describe("Exercise name (fuzzy-matched)"),
        weeks: z.number().int().min(1).max(52).describe("Number of weeks to look back"),
      }),
      execute: async ({ exercise_name, weeks }) => {
        const canonical = normalizeExerciseName(exercise_name);
        const now = new Date();
        const startDate = new Date(now);
        startDate.setUTCDate(startDate.getUTCDate() - weeks * 7);
        const startStr = startDate.toISOString().slice(0, 10);
        const endStr = now.toISOString().slice(0, 10);

        const sets = await prisma.workoutSet.findMany({
          where: {
            session: { userId },
            exerciseName: canonical,
            performedAt: dateRange(startStr, endStr),
          },
          select: {
            performedAt: true,
            reps: true,
            weightKg: true,
          },
          orderBy: { performedAt: "asc" },
        });

        // Group by week
        const weekMap = new Map<
          string,
          { topWeight: number; topReps: number; totalReps: number; totalVolume: number; sessions: Set<string> }
        >();

        // Pre-fill empty weeks
        for (let i = 0; i < weeks; i++) {
          const d = new Date(now);
          d.setUTCDate(d.getUTCDate() - i * 7);
          const key = mondayOf(d);
          if (!weekMap.has(key)) {
            weekMap.set(key, {
              topWeight: 0,
              topReps: 0,
              totalReps: 0,
              totalVolume: 0,
              sessions: new Set(),
            });
          }
        }

        for (const s of sets) {
          const key = mondayOf(s.performedAt);
          const w = weekMap.get(key) ?? {
            topWeight: 0,
            topReps: 0,
            totalReps: 0,
            totalVolume: 0,
            sessions: new Set<string>(),
          };
          weekMap.set(key, w);

          const weight = s.weightKg ?? 0;
          const reps = s.reps ?? 0;

          if (weight > w.topWeight || (weight === w.topWeight && reps > w.topReps)) {
            w.topWeight = weight;
            w.topReps = reps;
          }
          w.totalReps += reps;
          w.totalVolume += weight * reps;
          w.sessions.add(s.performedAt.toISOString().slice(0, 10));
        }

        const weeklyData = [...weekMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([week_start, w]) => ({
            week_start,
            top_set_weight_kg: w.topWeight,
            top_set_reps: w.topReps,
            total_reps: w.totalReps,
            total_volume_kg: Math.round(w.totalVolume * 10) / 10,
            sessions: w.sessions.size,
          }));

        return {
          exercise_name_canonical: canonical,
          weeks: weeklyData,
        };
      },
    }),

    daily_summary: tool({
      description:
        "Pre-aggregated daily snapshot: calories, macros, steps, weight, workout count and volume. Saves the agent from running 4 queries per day.",
      inputSchema: z.object({
        label: labelField,
        start_date: z.string().describe("Start date YYYY-MM-DD"),
        end_date: z.string().optional().describe("End date YYYY-MM-DD (defaults to start_date)"),
      }),
      execute: async ({ start_date, end_date: end_date_input }) => {
        const end_date = end_date_input ?? start_date;

        const [meals, metrics, sessions] = await Promise.all([
          prisma.mealLog.findMany({
            where: {
              userId,
              eatenAt: dateRange(start_date, end_date),
              interpretationStatus: { in: ["needs_review", "reviewed"] },
              calories: { not: null },
            },
            select: {
              eatenAt: true,
              calories: true,
              proteinG: true,
              carbsG: true,
              fatG: true,
            },
          }),
          prisma.dailyMetric.findMany({
            where: { userId, date: { gte: start_date, lte: end_date } },
            select: { date: true, steps: true, weightKg: true },
          }),
          prisma.workoutSession.findMany({
            where: { userId, startedAt: dateRange(start_date, end_date) },
            include: {
              sets: {
                select: { weightKg: true, reps: true },
              },
            },
          }),
        ]);

        // Build a map of date → daily summary
        const dayMap = new Map<
          string,
          {
            calories: number;
            proteinG: number | null;
            carbsG: number | null;
            fatG: number | null;
            steps: number | null;
            weightKg: number | null;
            workouts_done: number;
            workout_volume_kg: number;
          }
        >();

        // Generate all dates in range
        const cursor = new Date(start_date + "T00:00:00.000Z");
        const endDt = new Date(end_date + "T00:00:00.000Z");
        while (cursor <= endDt) {
          const key = cursor.toISOString().slice(0, 10);
          dayMap.set(key, {
            calories: 0,
            proteinG: null,
            carbsG: null,
            fatG: null,
            steps: null,
            weightKg: null,
            workouts_done: 0,
            workout_volume_kg: 0,
          });
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        // Aggregate meals
        for (const m of meals) {
          const key = m.eatenAt.toISOString().slice(0, 10);
          const day = dayMap.get(key);
          if (!day) continue;
          day.calories += m.calories ?? 0;
          if (m.proteinG != null) day.proteinG = (day.proteinG ?? 0) + m.proteinG;
          if (m.carbsG != null) day.carbsG = (day.carbsG ?? 0) + m.carbsG;
          if (m.fatG != null) day.fatG = (day.fatG ?? 0) + m.fatG;
        }

        // Fill metrics
        for (const m of metrics) {
          const day = dayMap.get(m.date);
          if (!day) continue;
          if (m.steps != null) day.steps = m.steps;
          if (m.weightKg != null) day.weightKg = m.weightKg;
        }

        // Fill workouts
        for (const s of sessions) {
          const key = s.startedAt.toISOString().slice(0, 10);
          const day = dayMap.get(key);
          if (!day) continue;
          day.workouts_done++;
          day.workout_volume_kg += s.sets.reduce(
            (sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0),
            0
          );
        }

        return [...dayMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, d]) => ({
            date,
            ...d,
            workout_volume_kg: Math.round(d.workout_volume_kg * 10) / 10,
          }));
      },
    }),

    // -----------------------------------------------------------------------
    // 5.3 Memory
    // -----------------------------------------------------------------------

    save_user_fact: tool({
      description:
        "Save a durable fact about the user that should persist across conversations (e.g., goals, injuries, dietary preferences, training history). Only call this for facts worth remembering long-term — not ephemeral statements.",
      inputSchema: z.object({
        label: labelField,
        category: z.enum([
          "goal",
          "dietary",
          "injury",
          "preference",
          "training_history",
          "other",
        ]),
        fact: z
          .string()
          .describe(
            "Short natural-language statement, e.g. 'user is bulking through April; targeting 80kg'"
          ),
      }),
      execute: async ({ category, fact }) => {
        const created = await prisma.userFact.create({
          data: { userId, category, fact },
        });
        return { ok: true, factId: created.id };
      },
    }),
  };
}

export type CoachTools = ReturnType<typeof coachTools>;
