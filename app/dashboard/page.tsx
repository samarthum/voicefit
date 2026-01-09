"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TodaySummaryCard } from "@/components/today-summary-card";
import { WeeklyTrendsCard } from "@/components/weekly-trends-card";
import { VoiceMealLogger } from "@/components/voice-meal-logger";
import { BottomNav } from "@/components/bottom-nav";
import { Utensils, Dumbbell, Footprints, Scale, ChevronLeft, ChevronRight } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mealSheetOpen, setMealSheetOpen] = useState(false);

  // Initialize with today's date in YYYY-MM-DD format
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toLocaleDateString("en-CA");
  });

  const fetchDashboard = useCallback(async (date: string) => {
    try {
      setIsLoading(true);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
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

  const navigateDate = (days: number) => {
    const currentDate = new Date(selectedDate + "T12:00:00");
    currentDate.setDate(currentDate.getDate() + days);
    const newDate = currentDate.toLocaleDateString("en-CA");
    setSelectedDate(newDate);
  };

  const goToPreviousDay = () => navigateDate(-1);
  const goToNextDay = () => navigateDate(1);
  const goToToday = () => setSelectedDate(new Date().toLocaleDateString("en-CA"));

  useEffect(() => {
    fetchDashboard(selectedDate);
  }, [selectedDate, fetchDashboard]);

  const handleMealSaved = () => {
    setMealSheetOpen(false);
    fetchDashboard(selectedDate);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Toaster />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-background via-background to-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex h-16 items-center justify-between px-4 max-w-lg mx-auto">
          <div className="flex-1">
            <h1 className="text-lg font-display text-foreground">{getGreeting()}</h1>
            <p className="text-xs text-muted-foreground">Let&apos;s track your wellness</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToPreviousDay}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs font-medium min-w-[100px]"
                onClick={goToToday}
              >
                {formatDateDisplay(selectedDate)}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToNextDay}
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Today Summary */}
        <div className="animate-fade-up">
          {isLoading ? (
            <Skeleton className="h-[280px] w-full rounded-2xl" />
          ) : data ? (
            <TodaySummaryCard
              dateLabel={formatDateDisplay(selectedDate)}
              calories={data.today.calories}
              steps={data.today.steps}
              weight={data.today.weight}
              workoutSessions={data.today.workoutSessions}
              workoutSets={data.today.workoutSets}
            />
          ) : null}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 stagger-children">
          <Sheet open={mealSheetOpen} onOpenChange={setMealSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="h-auto py-5 flex flex-col gap-3 bg-card hover:bg-card border-border/60 hover:border-primary/30 shadow-sm hover:shadow-md transition-all duration-300 group"
              >
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Utensils className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">Log Meal</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle className="font-display text-xl">Log Meal</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col items-center justify-center py-8">
                <VoiceMealLogger onMealSaved={handleMealSaved} />
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Tap the button and describe your meal
                </p>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="outline"
            className="h-auto py-5 flex flex-col gap-3 bg-card hover:bg-card border-border/60 hover:border-secondary-foreground/30 shadow-sm hover:shadow-md transition-all duration-300 group"
            onClick={() => router.push("/workouts/new")}
          >
            <div className="p-3 rounded-xl bg-secondary group-hover:bg-secondary/80 transition-colors">
              <Dumbbell className="h-5 w-5 text-secondary-foreground" />
            </div>
            <span className="font-medium">Start Workout</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-5 flex flex-col gap-3 bg-card hover:bg-card border-border/60 hover:border-accent-foreground/30 shadow-sm hover:shadow-md transition-all duration-300 group"
            onClick={() => router.push("/metrics?tab=steps")}
          >
            <div className="p-3 rounded-xl bg-accent group-hover:bg-accent/80 transition-colors">
              <Footprints className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="font-medium">Log Steps</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-5 flex flex-col gap-3 bg-card hover:bg-card border-border/60 hover:border-muted-foreground/30 shadow-sm hover:shadow-md transition-all duration-300 group"
            onClick={() => router.push("/metrics?tab=weight")}
          >
            <div className="p-3 rounded-xl bg-muted group-hover:bg-muted/80 transition-colors">
              <Scale className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="font-medium">Log Weight</span>
          </Button>
        </div>

        {/* Weekly Trends */}
        <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
          {isLoading ? (
            <Skeleton className="h-[340px] w-full rounded-2xl" />
          ) : data ? (
            <WeeklyTrendsCard data={data.weeklyTrends} />
          ) : null}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
