"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { UserButton } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { TodaySummaryCard } from "@/components/today-summary-card";
import { WeeklyTrendsCard } from "@/components/weekly-trends-card";
import { ConversationInput } from "@/components/conversation-input";
import { BottomNav } from "@/components/bottom-nav";
import type { ConversationFeedEvent } from "@/components/conversation-item";
import type { DashboardData } from "@/lib/types";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";

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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isStepsLoading, setIsStepsLoading] = useState(false);
  const stepsSyncId = useRef(0);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toLocaleDateString("en-CA");
  });
  const keyboardOffset = useKeyboardOffset();

  const syncFitbitSteps = useCallback(async (date: string) => {
    const syncRequestId = ++stepsSyncId.current;
    setIsStepsLoading(true);

    try {
      const response = await fetch(`/api/fitbit/sync?date=${encodeURIComponent(date)}`);
      const result = await response.json();

      if (stepsSyncId.current !== syncRequestId) return;

      if (result.success && typeof result.data?.steps === "number") {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            today: {
              ...prev.today,
              steps: {
                ...prev.today.steps,
                count: result.data.steps,
              },
            },
          };
        });
      }
    } catch (error) {
      if (stepsSyncId.current !== syncRequestId) return;
      console.error("Fitbit sync error:", error);
    } finally {
      if (stepsSyncId.current === syncRequestId) {
        setIsStepsLoading(false);
      }
    }
  }, []);

  const fetchDashboard = useCallback(async (date: string, showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      else setIsNavigating(true);
      const isTodayDate = date === new Date().toLocaleDateString("en-CA");
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const minLoadingTime = showLoading ? 0 : 200;
      const startTime = Date.now();

      if (!isTodayDate) {
        stepsSyncId.current += 1;
        setIsStepsLoading(false);
      }

      const response = await fetch(
        `/api/dashboard?timezone=${encodeURIComponent(timezone)}&date=${date}`
      );
      const result = await response.json();

      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingTime - elapsed));
      }

      if (result.success) {
        setData(result.data);
        if (isTodayDate) {
          void syncFitbitSteps(date);
        }
      } else {
        toast.error("Failed to load dashboard data");
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      setIsNavigating(false);
    }
  }, [syncFitbitSteps]);

  const navigateDate = (days: number) => {
    const currentDate = new Date(selectedDate + "T12:00:00");
    currentDate.setDate(currentDate.getDate() + days);
    const newDate = currentDate.toLocaleDateString("en-CA");
    setSelectedDate(newDate);
  };

  const goToPreviousDay = () => navigateDate(-1);
  const goToNextDay = () => navigateDate(1);

  const isToday = selectedDate === new Date().toLocaleDateString("en-CA");

  const isInitialLoad = useRef(true);
  useEffect(() => {
    fetchDashboard(selectedDate, isInitialLoad.current);
    isInitialLoad.current = false;
  }, [selectedDate, fetchDashboard]);

  const handleOptimisticEvent = useCallback((event: ConversationFeedEvent) => {
    void event;
  }, []);
  const handleEventResolved = useCallback((eventId: string) => {
    void eventId;
  }, []);
  const handleEventFailed = useCallback((eventId: string, error: string) => {
    void eventId;
    void error;
  }, []);

  const handleLogUpdated = useCallback(async () => {
    fetchDashboard(selectedDate);
  }, [fetchDashboard, selectedDate]);

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

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="animate-fade-up">
          <div className={`transition-all duration-150 ${isNavigating ? "opacity-50 scale-[0.98] pointer-events-none" : ""}`}>
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
                isStepsLoading={isStepsLoading && isToday}
              />
            ) : null}
          </div>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full rounded-2xl" />
          ) : data ? (
            <WeeklyTrendsCard data={data.weeklyTrends} calorieGoal={data.today.calories.goal} />
          ) : null}
        </div>

      </main>

      <div
        className="fixed bottom-20 left-0 right-0 z-40 px-4 pointer-events-none transition-transform duration-200 ease-out"
        style={{ transform: `translateY(-${keyboardOffset}px)` }}
      >
        <div className="max-w-lg mx-auto pointer-events-auto">
          <ConversationInput
            onEventOptimistic={handleOptimisticEvent}
            onEventResolved={handleEventResolved}
            onEventFailed={handleEventFailed}
            onRefresh={handleLogUpdated}
          />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
