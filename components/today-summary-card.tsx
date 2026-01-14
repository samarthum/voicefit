"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadialProgress } from "@/components/ui/radial-progress";
import { Button } from "@/components/ui/button";
import { Scale, Dumbbell, ChevronLeft, ChevronRight } from "lucide-react";

interface TodaySummaryCardProps {
  dateLabel?: string;
  calories: {
    consumed: number;
    goal: number;
  };
  steps: {
    count: number | null;
    goal: number;
  };
  weight: number | null;
  workoutSessions: number;
  workoutSets: number;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  isToday?: boolean;
}

export function TodaySummaryCard({
  dateLabel = "Today",
  calories,
  steps,
  weight,
  workoutSessions,
  workoutSets,
  onPreviousDay,
  onNextDay,
  isToday = true,
}: TodaySummaryCardProps) {
  // Calculate remaining calories (goal - consumed)
  const caloriesRemaining = Math.max(calories.goal - calories.consumed, 0);
  const calorieProgress = Math.min((calories.consumed / calories.goal) * 100, 100);

  // Calculate step progress (completed / goal)
  const stepsCompleted = steps.count ?? 0;
  const stepProgress = Math.min((stepsCompleted / steps.goal) * 100, 100);

  return (
    <Card className="relative overflow-hidden">
      {/* Decorative background blob */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-gradient-to-tr from-secondary/20 to-transparent blur-2xl pointer-events-none" />

      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-display">{dateLabel}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onPreviousDay}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onNextDay}
              disabled={isToday}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 relative">
        {/* Radial Progress Section - Two columns */}
        <div className="grid grid-cols-2 gap-4">
          {/* Calories - Remaining */}
          <div className="flex flex-col items-center">
            <RadialProgress
              value={calorieProgress}
              size={130}
              strokeWidth={10}
              indicatorClassName="stroke-primary"
            >
              <span className="text-xs text-muted-foreground">Remaining</span>
              <span className="text-2xl font-bold tabular-nums">
                {caloriesRemaining.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                Goal {calories.goal.toLocaleString()} kcal
              </span>
            </RadialProgress>
            <span className="mt-2 text-sm font-medium text-muted-foreground">Calories</span>
          </div>

          {/* Steps - Completed */}
          <div className="flex flex-col items-center">
            <RadialProgress
              value={stepProgress}
              size={130}
              strokeWidth={10}
              indicatorClassName="stroke-secondary-foreground"
            >
              <span className="text-xs text-muted-foreground">Completed</span>
              <span className="text-2xl font-bold tabular-nums">
                {stepsCompleted.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                Goal {steps.goal.toLocaleString()}
              </span>
            </RadialProgress>
            <span className="mt-2 text-sm font-medium text-muted-foreground">Steps</span>
          </div>
        </div>

        {/* Weight and Workouts */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/40 transition-colors hover:bg-accent/60">
            <div className="p-2 rounded-lg bg-accent">
              <Scale className="h-5 w-5 text-accent-foreground/80" />
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums">
                {weight ? `${weight} kg` : "---"}
              </p>
              <p className="text-xs text-muted-foreground">Weight</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/40 transition-colors hover:bg-secondary/60">
            <div className="p-2 rounded-lg bg-secondary">
              <Dumbbell className="h-5 w-5 text-secondary-foreground/80" />
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums">
                {workoutSets}
              </p>
              <p className="text-xs text-muted-foreground">
                {workoutSessions} session{workoutSessions !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
