import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Footprints, Scale } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import type { DashboardData } from "@voicefit/shared/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface TodaySummaryCardProps {
  data: DashboardData["today"];
  dateLabel?: string;
}

function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 6,
  color = "#f97316",
  trackColor = "rgba(15, 23, 42, 0.08)",
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (clampedProgress / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={[circumference, circumference]}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

export function TodaySummaryCard({
  data,
  dateLabel = "Today",
}: TodaySummaryCardProps) {
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
  const isStepsLoading = data.steps.count === null;

  return (
    <Card className="border-border/60 bg-card/70 overflow-hidden">
      {/* Glow blobs */}
      <View
        className="absolute -top-20 right-0 w-36 h-36 rounded-full"
        style={{
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          transform: [{ scale: 1.5 }],
        }}
        pointerEvents="none"
      />
      <View
        className="absolute -bottom-24 left-4 w-40 h-40 rounded-full"
        style={{
          backgroundColor: "rgba(168, 85, 247, 0.12)",
          transform: [{ scale: 1.5 }],
        }}
        pointerEvents="none"
      />

      {/* Header */}
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-display text-foreground">
          {dateLabel}
        </CardTitle>
        <Text className="text-xs text-muted-foreground font-sans">
          Daily snapshot
        </Text>
      </CardHeader>

      {/* Content */}
      <CardContent className="pb-6 gap-3">
        {/* Calories Panel */}
        <View className="rounded-2xl border border-border/60 bg-muted/40 p-4">
          <View className="flex-row items-center justify-between">
            <View className="gap-1">
              <Text className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-sans">
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
            <View className="w-12 h-12 items-center justify-center">
              <ProgressRing progress={calorieProgress} />
              <View className="absolute w-9 h-9 rounded-full bg-background/90" />
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
                <Footprints size={16} color="#6ee7b7" />
              </View>
              <View>
                <Text className="text-xs text-muted-foreground font-sans">
                  Steps
                </Text>
                {isStepsLoading ? (
                  <Skeleton
                    className="h-5 rounded-full bg-success/10 mt-1"
                    width={80}
                  />
                ) : (
                  <Text className="text-lg font-sans-semibold tabular-nums text-foreground">
                    {data.steps.count?.toLocaleString() ?? "---"}
                  </Text>
                )}
              </View>
            </View>
            {isStepsLoading ? (
              <Skeleton className="h-1.5 rounded-full bg-success/10 mt-3 w-full" />
            ) : (
              <Progress
                value={stepProgress}
                variant="success"
                className="mt-3 h-1.5"
              />
            )}
          </View>

          {/* Weight Panel */}
          <View className="flex-1 rounded-2xl border border-border/60 bg-card/60 p-4">
            <View className="flex-row items-center gap-3">
              <View className="rounded-xl bg-secondary/15 p-2">
                <Scale size={16} color="#93c5fd" />
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
            <LinearGradient
              colors={[
                "rgba(59, 130, 246, 0.2)",
                "rgba(96, 165, 250, 0.12)",
                "rgba(255, 255, 255, 0)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 6, borderRadius: 999, marginTop: 12, width: "100%" }}
            />
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
