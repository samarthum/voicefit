"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Utensils, Footprints, Scale, Dumbbell } from "lucide-react";

interface TodaySummaryCardProps {
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Today</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calories */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Calories</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {calories.consumed.toLocaleString()} / {calories.goal.toLocaleString()} kcal
            </span>
          </div>
          <Progress value={calorieProgress} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Footprints className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Steps</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {steps.count?.toLocaleString() ?? "—"} / {steps.goal.toLocaleString()}
            </span>
          </div>
          <Progress value={stepProgress} className="h-2" />
        </div>

        {/* Weight and Workouts */}
        <div className="flex gap-4 pt-2">
          <div className="flex items-center gap-2 flex-1">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {weight ? `${weight} kg` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Weight</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {workoutSessions} session{workoutSessions !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {workoutSets} set{workoutSets !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
