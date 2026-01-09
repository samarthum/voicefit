"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Utensils, Footprints, Scale, Dumbbell } from "lucide-react";

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
}

export function TodaySummaryCard({
  dateLabel = "Today",
  calories,
  steps,
  weight,
  workoutSessions,
  workoutSets,
}: TodaySummaryCardProps) {
  const calorieProgress = Math.min((calories.consumed / calories.goal) * 100, 100);
  const stepProgress = steps.count
    ? Math.min((steps.count / steps.goal) * 100, 100)
    : 0;

  return (
    <Card className="relative overflow-hidden">
      {/* Decorative background blob */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-gradient-to-tr from-secondary/20 to-transparent blur-2xl pointer-events-none" />

      <CardHeader className="pb-2 relative">
        <CardTitle className="text-xl font-display">{dateLabel}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 relative">
        {/* Calories */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Utensils className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold">Calories</span>
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              {calories.consumed.toLocaleString()} / {calories.goal.toLocaleString()} kcal
            </span>
          </div>
          <Progress value={calorieProgress} />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-secondary">
                <Footprints className="h-4 w-4 text-secondary-foreground" />
              </div>
              <span className="text-sm font-semibold">Steps</span>
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              {steps.count?.toLocaleString() ?? "---"} / {steps.goal.toLocaleString()}
            </span>
          </div>
          <Progress
            value={stepProgress}
            className="[&>div]:bg-gradient-to-r [&>div]:from-secondary-foreground/80 [&>div]:to-secondary-foreground/60"
          />
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
