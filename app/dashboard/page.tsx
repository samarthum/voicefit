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
import { Utensils, Dumbbell, Footprints, Scale } from "lucide-react";
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

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mealSheetOpen, setMealSheetOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(`/api/dashboard?timezone=${encodeURIComponent(timezone)}`);
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

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleMealSaved = () => {
    setMealSheetOpen(false);
    fetchDashboard();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Toaster />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Health Tracker</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Today Summary */}
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : data ? (
          <TodaySummaryCard
            calories={data.today.calories}
            steps={data.today.steps}
            weight={data.today.weight}
            workoutSessions={data.today.workoutSessions}
            workoutSets={data.today.workoutSets}
          />
        ) : null}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Sheet open={mealSheetOpen} onOpenChange={setMealSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                <Utensils className="h-5 w-5" />
                <span>Log Meal</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Log Meal</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col items-center justify-center py-8">
                <VoiceMealLogger onMealSaved={handleMealSaved} />
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Hold the button and describe your meal
                </p>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => router.push("/workouts/new")}
          >
            <Dumbbell className="h-5 w-5" />
            <span>Start Workout</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => router.push("/metrics?tab=steps")}
          >
            <Footprints className="h-5 w-5" />
            <span>Log Steps</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => router.push("/metrics?tab=weight")}
          >
            <Scale className="h-5 w-5" />
            <span>Log Weight</span>
          </Button>
        </div>

        {/* Weekly Trends */}
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data ? (
          <WeeklyTrendsCard data={data.weeklyTrends} />
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}
