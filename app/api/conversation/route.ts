import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { createConversationEventSchema, listConversationQuerySchema } from "@/lib/validations";

const toLocalDateString = (value: Date, timezone?: string) =>
  value.toLocaleDateString("en-CA", timezone ? { timeZone: timezone } : undefined);

const parseDateString = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getEventDate = (
  event: { metadata: Record<string, unknown> | null; createdAt: Date },
  timezone?: string
) => {
  const metadata = event.metadata ?? {};
  const metadataDate = typeof metadata.date === "string" ? metadata.date : null;
  if (metadataDate) return metadataDate;

  const eatenAt = typeof metadata.eatenAt === "string" ? metadata.eatenAt : null;
  if (eatenAt) {
    const parsed = parseDateString(eatenAt);
    if (parsed) return toLocalDateString(parsed, timezone);
  }

  const performedAt = typeof metadata.performedAt === "string" ? metadata.performedAt : null;
  if (performedAt) {
    const parsed = parseDateString(performedAt);
    if (parsed) return toLocalDateString(parsed, timezone);
  }

  return toLocalDateString(event.createdAt, timezone);
};

const serializeEvent = (event: { createdAt: Date }) => ({
  ...event,
  createdAt: event.createdAt.toISOString(),
});

const getMetadataObject = (metadata: unknown): Record<string, unknown> => {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
};

const hydrateWorkoutEvents = async <
  T extends { kind: string; referenceId: string | null; metadata: unknown }
>(
  events: T[]
): Promise<T[]> => {
  const workoutSetIds = Array.from(
    new Set(
      events
        .filter((event) => event.kind === "workout_set" && event.referenceId)
        .map((event) => event.referenceId as string)
    )
  );

  if (!workoutSetIds.length) {
    return events;
  }

  const sets = await prisma.workoutSet.findMany({
    where: { id: { in: workoutSetIds } },
    select: {
      id: true,
      exerciseName: true,
      exerciseType: true,
      reps: true,
      weightKg: true,
      durationMinutes: true,
      notes: true,
      performedAt: true,
      session: {
        select: {
          id: true,
          title: true,
          startedAt: true,
          endedAt: true,
        },
      },
    },
  });

  const setMap = new Map(sets.map((set) => [set.id, set]));

  return events.map((event) => {
    if (event.kind !== "workout_set" || !event.referenceId) {
      return event;
    }

    const set = setMap.get(event.referenceId);
    if (!set) {
      return event;
    }

    const metadata = getMetadataObject(event.metadata);
    const mergedMetadata = {
      ...metadata,
      exerciseName: metadata.exerciseName ?? set.exerciseName,
      exerciseType: metadata.exerciseType ?? set.exerciseType,
      reps: metadata.reps ?? set.reps,
      weightKg: metadata.weightKg ?? set.weightKg,
      durationMinutes: metadata.durationMinutes ?? set.durationMinutes,
      notes: metadata.notes ?? set.notes,
      performedAt: metadata.performedAt ?? set.performedAt.toISOString(),
      sessionId: metadata.sessionId ?? set.session.id,
      sessionTitle: metadata.sessionTitle ?? set.session.title,
      sessionStartedAt: metadata.sessionStartedAt ?? set.session.startedAt.toISOString(),
      sessionEndedAt:
        metadata.sessionEndedAt ?? (set.session.endedAt ? set.session.endedAt.toISOString() : null),
    };

    return {
      ...event,
      metadata: mergedMetadata,
    };
  });
};

// GET /api/conversation - List conversation events
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const { searchParams } = new URL(request.url);
    const queryResult = listConversationQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? 30,
      offset: searchParams.get("offset") ?? 0,
      before: searchParams.get("before") ?? undefined,
      date: searchParams.get("date") ?? undefined,
      timezone: searchParams.get("timezone") ?? undefined,
      kind: searchParams.get("kind") ?? undefined,
    });

    if (!queryResult.success) {
      return errorResponse(queryResult.error.issues[0].message);
    }

    const { limit, offset, before, date, timezone, kind } = queryResult.data;
    const baseWhere = {
      userId: user.id,
      ...(kind ? { kind } : {}),
    };

    if (date) {
      const events = await prisma.conversationEvent.findMany({
        where: {
          ...baseWhere,
          ...(before ? { createdAt: { lt: new Date(before) } } : {}),
        },
        orderBy: { createdAt: "desc" },
      });

      const hydratedEvents = await hydrateWorkoutEvents(events);
      const filteredEvents = hydratedEvents.filter(
        (event) => getEventDate(event, timezone) === date
      );
      const pagedEvents = filteredEvents.slice(offset, offset + limit);
      const hasMore = offset + pagedEvents.length < filteredEvents.length;
      const nextBefore =
        hasMore && pagedEvents.length
          ? pagedEvents[pagedEvents.length - 1].createdAt.toISOString()
          : null;

      return successResponse({
        events: pagedEvents.map((event) => serializeEvent(event)),
        total: filteredEvents.length,
        limit,
        offset,
        nextBefore,
      });
    }

    const where = {
      ...baseWhere,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    };

    const [events, total] = await Promise.all([
      prisma.conversationEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.conversationEvent.count({ where: baseWhere }),
    ]);

    const nextBefore =
      events.length === limit ? events[events.length - 1].createdAt.toISOString() : null;
    const hydratedEvents = await hydrateWorkoutEvents(events);

    return successResponse({
      events: hydratedEvents.map((event) => serializeEvent(event)),
      total,
      limit,
      offset,
      nextBefore,
    });
  } catch (error) {
    console.error("List conversation error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to list conversation events", 500);
  }
}

// POST /api/conversation - Create conversation event
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const body = await request.json();
    const parseResult = createConversationEventSchema.safeParse(body);

    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const event = await prisma.conversationEvent.create({
      data: {
        userId: user.id,
        ...parseResult.data,
      },
    });

    return successResponse(
      {
        ...event,
        createdAt: event.createdAt.toISOString(),
      },
      201
    );
  } catch (error) {
    console.error("Create conversation error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to create conversation event", 500);
  }
}
