import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { createConversationEvents } from "@/lib/conversation-events";

// POST /api/conversation/backfill - Backfill conversation events for existing logs
export async function POST() {
  try {
    const user = await getCurrentUser();

    const existingEvents = await prisma.conversationEvent.findMany({
      where: { userId: user.id },
      select: { referenceType: true, referenceId: true, kind: true },
    });

    const existingKeys = new Set(
      existingEvents.map((event) => `${event.referenceType}:${event.referenceId}:${event.kind}`)
    );

    const [meals, workoutSets, dailyMetrics] = await Promise.all([
      prisma.mealLog.findMany({ where: { userId: user.id } }),
      prisma.workoutSet.findMany({
        where: { session: { userId: user.id } },
        include: {
          session: {
            select: {
              id: true,
              title: true,
              startedAt: true,
              endedAt: true,
            },
          },
        },
      }),
      prisma.dailyMetric.findMany({ where: { userId: user.id } }),
    ]);

    const eventsToCreate = [];

    for (const meal of meals) {
      const key = `meal:${meal.id}:meal`;
      if (existingKeys.has(key)) continue;

      eventsToCreate.push({
        userId: user.id,
        kind: "meal" as const,
        userText: meal.transcriptRaw?.trim() || meal.description,
        systemText: `Logged ${meal.description} · ${meal.calories} kcal`,
        source: "system" as const,
        referenceType: "meal",
        referenceId: meal.id,
        metadata: {
          mealType: meal.mealType,
          description: meal.description,
          calories: meal.calories,
          eatenAt: meal.eatenAt.toISOString(),
        },
      });
    }

    for (const set of workoutSets) {
      const key = `workout_set:${set.id}:workout_set`;
      if (existingKeys.has(key)) continue;

      const details = [];
      if (set.exerciseType === "cardio" && set.durationMinutes !== null) {
        details.push(`${set.durationMinutes} min`);
      }
      if (set.exerciseType !== "cardio") {
        if (set.reps !== null) details.push(`${set.reps} reps`);
        if (set.weightKg !== null) details.push(`${set.weightKg} kg`);
      }
      const detailText = details.length ? ` · ${details.join(" · ")}` : "";

      eventsToCreate.push({
        userId: user.id,
        kind: "workout_set" as const,
        userText: set.transcriptRaw?.trim() || `Added ${set.exerciseName}`,
        systemText: `Logged ${set.exerciseName}${detailText}`,
        source: "system" as const,
        referenceType: "workout_set",
        referenceId: set.id,
        metadata: {
          exerciseName: set.exerciseName,
          exerciseType: set.exerciseType,
          reps: set.reps,
          weightKg: set.weightKg,
          durationMinutes: set.durationMinutes,
          notes: set.notes,
          performedAt: set.performedAt.toISOString(),
          sessionId: set.session.id,
          sessionTitle: set.session.title,
          sessionStartedAt: set.session.startedAt.toISOString(),
          sessionEndedAt: set.session.endedAt ? set.session.endedAt.toISOString() : null,
        },
      });
    }

    for (const metric of dailyMetrics) {
      if (metric.steps !== null) {
        const key = `daily_metric:${metric.id}:steps`;
        if (!existingKeys.has(key)) {
          eventsToCreate.push({
            userId: user.id,
            kind: "steps" as const,
            userText: `Steps ${metric.steps}`,
            systemText: `Saved ${metric.steps.toLocaleString()} steps`,
            source: "system" as const,
            referenceType: "daily_metric",
            referenceId: metric.id,
            metadata: { steps: metric.steps, date: metric.date },
          });
        }
      }

      if (metric.weightKg !== null) {
        const key = `daily_metric:${metric.id}:weight`;
        if (!existingKeys.has(key)) {
          eventsToCreate.push({
            userId: user.id,
            kind: "weight" as const,
            userText: `Weight ${metric.weightKg} kg`,
            systemText: `Saved weight ${metric.weightKg} kg`,
            source: "system" as const,
            referenceType: "daily_metric",
            referenceId: metric.id,
            metadata: { weightKg: metric.weightKg, date: metric.date },
          });
        }
      }
    }

    await createConversationEvents(eventsToCreate);

    return successResponse({ created: eventsToCreate.length });
  } catch (error) {
    console.error("Conversation backfill error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to backfill conversation events", 500);
  }
}
