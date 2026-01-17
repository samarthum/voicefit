"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { UserButton } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { TodaySummaryCard } from "@/components/today-summary-card";
import { WeeklyTrendsCard } from "@/components/weekly-trends-card";
import { ConversationFeed } from "@/components/conversation-feed";
import { ConversationInput } from "@/components/conversation-input";
import { BottomNav } from "@/components/bottom-nav";
import type { ConversationFeedEvent } from "@/components/conversation-item";
import type { DashboardData } from "@/lib/types";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Yesterday";
  if (diffDays === 1) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const getMetadataObject = (metadata: ConversationFeedEvent["metadata"]) => {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
};

function getEventLocalDate(event: ConversationFeedEvent): string {
  const metadata = getMetadataObject(event.metadata);
  const metadataDate = typeof metadata.date === "string" ? metadata.date : null;
  if (metadataDate) return metadataDate;

  const sessionOccurredAt =
    typeof metadata.sessionOccurredAt === "string" ? metadata.sessionOccurredAt : null;
  if (sessionOccurredAt) return new Date(sessionOccurredAt).toLocaleDateString("en-CA");

  const eatenAt = typeof metadata.eatenAt === "string" ? metadata.eatenAt : null;
  if (eatenAt) return new Date(eatenAt).toLocaleDateString("en-CA");

  const performedAt = typeof metadata.performedAt === "string" ? metadata.performedAt : null;
  if (performedAt) return new Date(performedAt).toLocaleDateString("en-CA");

  return new Date(event.createdAt).toLocaleDateString("en-CA");
}

type WorkoutSessionSet = {
  id?: string;
  exerciseName: string;
  exerciseType?: string;
  reps?: number | null;
  weightKg?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
  performedAt?: string;
};

const getEventOccurrenceTimestamp = (event: ConversationFeedEvent): number => {
  const metadata = getMetadataObject(event.metadata);
  const candidates = [
    typeof metadata.sessionOccurredAt === "string" ? metadata.sessionOccurredAt : null,
    typeof metadata.performedAt === "string" ? metadata.performedAt : null,
    typeof metadata.eatenAt === "string" ? metadata.eatenAt : null,
    event.createdAt,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  }

  return new Date(event.createdAt).getTime();
};

const groupWorkoutSessions = (events: ConversationFeedEvent[]): ConversationFeedEvent[] => {
  const grouped: ConversationFeedEvent[] = [];
  const sessions = new Map<
    string,
    {
      sessionId: string;
      sessionDate: string;
      sessionTitle?: string;
      sets: WorkoutSessionSet[];
      latestTimestamp: number;
      status?: "pending" | "failed";
      error?: string;
    }
  >();

  for (const event of events) {
    if (event.kind !== "workout_set") {
      grouped.push(event);
      continue;
    }

    const metadata = getMetadataObject(event.metadata);
    const sessionId = typeof metadata.sessionId === "string" ? metadata.sessionId : null;
    if (!sessionId) {
      grouped.push(event);
      continue;
    }

    const exerciseName =
      typeof metadata.exerciseName === "string"
        ? metadata.exerciseName
        : event.userText?.trim() || "Workout set";
    const performedAt =
      typeof metadata.performedAt === "string" ? metadata.performedAt : event.createdAt;
    const setTimestamp = new Date(performedAt).getTime();
    const sessionDate = getEventLocalDate(event);
    const sessionKey = `${sessionId}:${sessionDate}`;
    const sessionTitle =
      typeof metadata.sessionTitle === "string" ? metadata.sessionTitle : undefined;

    const setSummary: WorkoutSessionSet = {
      id: event.referenceId ?? undefined,
      exerciseName,
      exerciseType: typeof metadata.exerciseType === "string" ? metadata.exerciseType : undefined,
      reps: typeof metadata.reps === "number" ? metadata.reps : null,
      weightKg: typeof metadata.weightKg === "number" ? metadata.weightKg : null,
      durationMinutes:
        typeof metadata.durationMinutes === "number" ? metadata.durationMinutes : null,
      notes: typeof metadata.notes === "string" ? metadata.notes : null,
      performedAt,
    };

    const existing = sessions.get(sessionKey);
    if (existing) {
      existing.sets.push(setSummary);
      existing.latestTimestamp = Math.max(existing.latestTimestamp, setTimestamp);
      if (event.status === "failed") {
        existing.status = "failed";
        existing.error = event.error ?? existing.error;
      } else if (event.status === "pending" && existing.status !== "failed") {
        existing.status = "pending";
      }
    } else {
      sessions.set(sessionKey, {
        sessionId,
        sessionDate,
        sessionTitle,
        sets: [setSummary],
        latestTimestamp: setTimestamp,
        status: event.status,
        error: event.error,
      });
    }
  }

  const sessionEvents = Array.from(sessions.values()).map((session) => {
    const sortedSets = [...session.sets].sort((a, b) => {
      const aTime = a.performedAt ? new Date(a.performedAt).getTime() : 0;
      const bTime = b.performedAt ? new Date(b.performedAt).getTime() : 0;
      return aTime - bTime;
    });
    const uniqueExercises = new Set(
      sortedSets.map((set) => set.exerciseName.toLowerCase().trim())
    );
    const setCount = sortedSets.length;
    const exerciseCount = uniqueExercises.size;
    const sessionOccurredAt = new Date(session.latestTimestamp).toISOString();

    return {
      id: `session-${session.sessionId}-${session.sessionDate}`,
      kind: "workout_set" as const,
      userText: "Workout session",
      systemText: `${setCount} set${setCount === 1 ? "" : "s"} · ${exerciseCount} exercise${
        exerciseCount === 1 ? "" : "s"
      }`,
      source: "system" as const,
      referenceType: "workout_session",
      referenceId: session.sessionId,
      metadata: {
        sessionId: session.sessionId,
        sessionTitle: session.sessionTitle,
        sessionSets: sortedSets,
        sessionSetCount: setCount,
        sessionExerciseCount: exerciseCount,
        sessionOccurredAt,
        date: session.sessionDate,
      },
      createdAt: sessionOccurredAt,
      status: session.status,
      error: session.error,
    };
  });

  return [...grouped, ...sessionEvents];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [conversationEvents, setConversationEvents] = useState<ConversationFeedEvent[]>([]);
  const [optimisticEvents, setOptimisticEvents] = useState<ConversationFeedEvent[]>([]);
  const [isConversationLoading, setIsConversationLoading] = useState(true);
  const [isConversationLoadingMore, setIsConversationLoadingMore] = useState(false);
  const [conversationNextBefore, setConversationNextBefore] = useState<string | null>(null);
  const backfillAttempted = useRef(false);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toLocaleDateString("en-CA");
  });

  const fetchDashboard = useCallback(async (date: string) => {
    try {
      setIsLoading(true);
      const isTodayDate = date === new Date().toLocaleDateString("en-CA");
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (isTodayDate) {
        try {
          await fetch(`/api/fitbit/sync?date=${encodeURIComponent(date)}`);
        } catch (error) {
          console.error("Fitbit sync error:", error);
        }
      }

      const response = await fetch(
        `/api/dashboard?timezone=${encodeURIComponent(timezone)}&date=${date}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast.error("Failed to load dashboard data");
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchConversation = useCallback(
    async (before?: string, append: boolean = false, allowBackfill: boolean = true) => {
      try {
        if (append) {
          setIsConversationLoadingMore(true);
        } else {
          setIsConversationLoading(true);
        }

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const params = new URLSearchParams({
          limit: "20",
          date: selectedDate,
          timezone,
          kind: "meal",
        });
        if (before) {
          params.set("before", before);
        }

        const response = await fetch(`/api/conversation?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          setConversationEvents((prev) =>
            append ? [...prev, ...result.data.events] : result.data.events
          );
          setConversationNextBefore(result.data.nextBefore);

          if (
            allowBackfill &&
            !append &&
            !result.data.events.length &&
            !backfillAttempted.current
          ) {
            backfillAttempted.current = true;
            await fetch("/api/conversation/backfill", { method: "POST" });
            await fetchConversation(undefined, false, false);
          }
        } else {
          toast.error("Failed to load conversation history");
        }
      } catch (error) {
        console.error("Conversation fetch error:", error);
        toast.error("Failed to load conversation history");
      } finally {
        setIsConversationLoading(false);
        setIsConversationLoadingMore(false);
      }
    },
    [selectedDate]
  );

  const navigateDate = (days: number) => {
    const currentDate = new Date(selectedDate + "T12:00:00");
    currentDate.setDate(currentDate.getDate() + days);
    const newDate = currentDate.toLocaleDateString("en-CA");
    setSelectedDate(newDate);
  };

  const goToPreviousDay = () => navigateDate(-1);
  const goToNextDay = () => navigateDate(1);

  const isToday = selectedDate === new Date().toLocaleDateString("en-CA");

  useEffect(() => {
    fetchDashboard(selectedDate);
  }, [selectedDate, fetchDashboard]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  const combinedEvents = useMemo(() => {
    const merged = [...optimisticEvents, ...conversationEvents];
    const filtered = merged.filter(
      (event) => event.kind === "meal" && getEventLocalDate(event) === selectedDate
    );
    const grouped = groupWorkoutSessions(filtered);
    const sorted = [...grouped].sort(
      (a, b) => getEventOccurrenceTimestamp(b) - getEventOccurrenceTimestamp(a)
    );
    return sorted.slice(0, 3);
  }, [conversationEvents, optimisticEvents, selectedDate]);

  const handleOptimisticEvent = useCallback((event: ConversationFeedEvent) => {
    setOptimisticEvents((prev) => [event, ...prev]);
  }, []);

  const handleEventResolved = useCallback((eventId: string) => {
    setOptimisticEvents((prev) => prev.filter((event) => event.id !== eventId));
  }, []);

  const handleEventFailed = useCallback((eventId: string, error: string) => {
    setOptimisticEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, status: "failed", error } : event
      )
    );
  }, []);

  const handleLoadMore = useCallback(() => {
    if (conversationNextBefore) {
      fetchConversation(conversationNextBefore, true, false);
    }
  }, [conversationNextBefore, fetchConversation]);

  const handleLogUpdated = useCallback(async () => {
    fetchDashboard(selectedDate);
    await fetchConversation();
  }, [fetchDashboard, fetchConversation, selectedDate]);

  return (
    <div className="min-h-screen bg-background pb-40">
      <Toaster />

      <header className="sticky top-0 z-40 bg-gradient-to-b from-background/90 via-background/80 to-background/70 backdrop-blur-sm border-b border-border/60">
        <div className="flex h-16 items-center justify-between px-4 max-w-lg mx-auto">
          <div>
            <h1 className="text-lg font-display text-foreground">{getGreeting()}</h1>
            <p className="text-xs text-muted-foreground">Let&apos;s track your wellness</p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6 pb-32">
        <div className="animate-fade-up">
          {isLoading ? (
            <Skeleton className="h-[200px] w-full rounded-2xl" />
          ) : data ? (
            <TodaySummaryCard
              dateLabel={formatDateDisplay(selectedDate)}
              calories={data.today.calories}
              steps={data.today.steps}
              weight={data.today.weight}
              onPreviousDay={goToPreviousDay}
              onNextDay={goToNextDay}
              isToday={isToday}
            />
          ) : null}
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full rounded-2xl" />
          ) : data ? (
            <WeeklyTrendsCard data={data.weeklyTrends} calorieGoal={data.today.calories.goal} />
          ) : null}
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Today&apos;s Log
            </h2>
          </div>
          <ConversationFeed
            events={combinedEvents}
            isLoading={isConversationLoading || isConversationLoadingMore}
            hasMore={false}
            onLoadMore={handleLoadMore}
          />
        </section>
      </main>

      <ConversationInput
        onEventOptimistic={handleOptimisticEvent}
        onEventResolved={handleEventResolved}
        onEventFailed={handleEventFailed}
        onRefresh={handleLogUpdated}
      />
      <BottomNav className="bottom-28" />
    </div>
  );
}
