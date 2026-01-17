"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Footprints, Scale, ChevronLeft, ChevronRight } from "lucide-react";

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
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  isToday?: boolean;
}

export function TodaySummaryCard({
  dateLabel = "Today",
  calories,
  steps,
  weight,
  onPreviousDay,
  onNextDay,
  isToday = true,
}: TodaySummaryCardProps) {
  const calorieProgress = Math.min((calories.consumed / calories.goal) * 100, 100);
  const stepProgress = steps.count
    ? Math.min((steps.count / steps.goal) * 100, 100)
    : 0;
  const calorieRemaining = Math.max(calories.goal - calories.consumed, 0);
  const calorieRingStyle = {
    background: `conic-gradient(#f97316 ${calorieProgress}%, rgba(255, 255, 255, 0.08) 0)`,
  };

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/70">
      <div className="absolute -top-20 right-0 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-4 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-display">{dateLabel}</CardTitle>
            <p className="text-xs text-muted-foreground">Daily snapshot</p>
          </div>
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

      <CardContent className="space-y-4 relative z-10">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-2xl border border-border/60 bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Calories
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums text-foreground">
                    {calories.consumed.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {calories.goal.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {calorieRemaining.toLocaleString()} remaining
                </p>
              </div>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full p-1"
                style={calorieRingStyle}
              >
                <div className="h-full w-full rounded-full bg-background/90" />
              </div>
            </div>
            <Progress
              value={calorieProgress}
              className="mt-3 h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-orange-500 [&>div]:to-orange-400"
            />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/15 p-2">
                <Footprints className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Steps</p>
                <p className="text-lg font-semibold tabular-nums">
                  {steps.count?.toLocaleString() ?? "---"}
                </p>
              </div>
            </div>
            <Progress
              value={stepProgress}
              className="mt-3 h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-400"
            />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-4 flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/15 p-2">
                <Scale className="h-4 w-4 text-blue-300" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Weight</p>
                <p className="text-lg font-semibold tabular-nums">
                  {weight ? `${weight} kg` : "---"}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-gradient-to-r from-blue-500/20 via-blue-400/10 to-transparent" />
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
