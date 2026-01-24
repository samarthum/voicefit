import { View, Text } from "react-native";
import { Footprints, Scale, Dumbbell } from "lucide-react-native";
import type { DashboardData } from "@voicefit/shared/types";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface TodaySummaryCardProps {
  data: DashboardData["today"];
}

export function TodaySummaryCard({ data }: TodaySummaryCardProps) {
  const calorieProgress = Math.min(
    (data.calories.consumed / data.calories.goal) * 100,
    100
  );
  const stepProgress = data.steps.count
    ? Math.min((data.steps.count / data.steps.goal) * 100, 100)
    : 0;
  const calorieRemaining = Math.max(
    data.calories.goal - data.calories.consumed,
    0
  );

  return (
    <Card className="border-border/60 bg-card/70 overflow-hidden">
      {/* Glow blobs */}
      <View
        className="absolute -top-20 right-0 w-36 h-36 rounded-full bg-success/10"
        style={{ transform: [{ scale: 1.5 }] }}
        pointerEvents="none"
      />
      <View
        className="absolute -bottom-24 left-4 w-40 h-40 rounded-full bg-snack/10"
        style={{ transform: [{ scale: 1.5 }] }}
        pointerEvents="none"
      />

      {/* Header */}
      <View className="px-6 pt-6 pb-4">
        <Text className="text-lg font-display text-foreground">Today</Text>
        <Text className="text-xs text-muted-foreground font-sans">
          Daily snapshot
        </Text>
      </View>

      {/* Content */}
      <View className="px-6 pb-6 gap-3">
        {/* Calories Panel */}
        <View className="rounded-2xl border border-border/60 bg-muted/40 p-4">
          <View className="flex-row items-center justify-between">
            <View className="gap-1">
              <Text className="text-[11px] uppercase tracking-widest text-muted-foreground font-sans">
                Calories
              </Text>
              <View className="flex-row items-baseline gap-2">
                <Text className="text-2xl font-sans-semibold text-foreground tabular-nums">
                  {data.calories.consumed.toLocaleString()}
                </Text>
                <Text className="text-xs text-muted-foreground font-sans">
                  / {data.calories.goal.toLocaleString()}
                </Text>
              </View>
              <Text className="text-xs text-muted-foreground font-sans">
                {calorieRemaining.toLocaleString()} remaining
              </Text>
            </View>
            {/* Calorie ring indicator */}
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{
                backgroundColor: `rgba(249, 115, 22, ${Math.min(calorieProgress / 100, 1) * 0.3})`,
              }}
            >
              <View className="w-9 h-9 rounded-full bg-background/90" />
            </View>
          </View>
          <Progress
            value={calorieProgress}
            variant="accent"
            className="mt-3 h-1.5"
          />
        </View>

        {/* Steps and Weight Row */}
        <View className="flex-row gap-3">
          {/* Steps Panel */}
          <View className="flex-1 rounded-2xl border border-border/60 bg-card/60 p-4">
            <View className="flex-row items-center gap-3">
              <View className="rounded-xl bg-success/15 p-2">
                <Footprints size={16} color="#22c55e" />
              </View>
              <View>
                <Text className="text-xs text-muted-foreground font-sans">
                  Steps
                </Text>
                <Text className="text-lg font-sans-semibold tabular-nums text-foreground">
                  {data.steps.count?.toLocaleString() ?? "---"}
                </Text>
              </View>
            </View>
            <Progress
              value={stepProgress}
              variant="success"
              className="mt-3 h-1.5"
            />
          </View>

          {/* Weight Panel */}
          <View className="flex-1 rounded-2xl border border-border/60 bg-card/60 p-4">
            <View className="flex-row items-center gap-3">
              <View className="rounded-xl bg-secondary/15 p-2">
                <Scale size={16} color="#3b82f6" />
              </View>
              <View>
                <Text className="text-xs text-muted-foreground font-sans">
                  Weight
                </Text>
                <Text className="text-lg font-sans-semibold tabular-nums text-foreground">
                  {data.weight ? `${data.weight} kg` : "---"}
                </Text>
              </View>
            </View>
            {/* Decorative gradient line */}
            <View className="mt-3 h-1.5 rounded-full bg-secondary/20" />
          </View>
        </View>

        {/* Workouts Panel */}
        <View className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="rounded-xl bg-primary/15 p-2">
                <Dumbbell size={16} color="#16a34a" />
              </View>
              <View>
                <Text className="text-xs text-muted-foreground font-sans">
                  Workouts
                </Text>
                <Text className="text-lg font-sans-semibold tabular-nums text-foreground">
                  {data.workoutSessions}{" "}
                  <Text className="text-xs text-muted-foreground font-sans font-normal">
                    sessions
                  </Text>
                </Text>
              </View>
            </View>
            <View className="bg-primary/10 px-3 py-1.5 rounded-full">
              <Text className="text-sm font-sans-semibold text-primary tabular-nums">
                {data.workoutSets} sets
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}
