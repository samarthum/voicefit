import { View, Text } from "react-native";
import type { DashboardData } from "@voicefit/shared/types";

interface TodaySummaryCardProps {
  data: DashboardData["today"];
}

function CircularProgress({
  progress,
  color,
  size = 80,
}: {
  progress: number;
  color: string;
  size?: number;
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <View style={{ width: size, height: size }}>
      {/* Background circle */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: "#e5e7eb",
        }}
      />
      {/* Progress circle - simplified with border */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: clampedProgress > 0.25 ? color : "transparent",
          borderRightColor: clampedProgress > 0.5 ? color : "transparent",
          borderBottomColor: clampedProgress > 0.75 ? color : "transparent",
          transform: [{ rotate: "-90deg" }],
          opacity: clampedProgress > 0 ? 1 : 0,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#374151",
          }}
        >
          {Math.round(clampedProgress * 100)}%
        </Text>
      </View>
    </View>
  );
}

export function TodaySummaryCard({ data }: TodaySummaryCardProps) {
  const calorieProgress = data.calories.consumed / data.calories.goal;
  const stepProgress = (data.steps.count ?? 0) / data.steps.goal;

  return (
    <View className="bg-card border border-border rounded-2xl p-5 mt-4">
      <Text className="text-foreground font-semibold text-lg mb-4">
        Today's Progress
      </Text>

      <View className="flex-row justify-around">
        {/* Calories */}
        <View className="items-center">
          <CircularProgress
            progress={calorieProgress}
            color={calorieProgress > 1 ? "#ef4444" : "#3b82f6"}
          />
          <Text className="text-foreground font-semibold mt-3">
            {data.calories.consumed.toLocaleString()}
          </Text>
          <Text className="text-muted-foreground text-xs">
            / {data.calories.goal.toLocaleString()} kcal
          </Text>
        </View>

        {/* Steps */}
        <View className="items-center">
          <CircularProgress
            progress={stepProgress}
            color={stepProgress >= 1 ? "#22c55e" : "#f59e0b"}
          />
          <Text className="text-foreground font-semibold mt-3">
            {(data.steps.count ?? 0).toLocaleString()}
          </Text>
          <Text className="text-muted-foreground text-xs">
            / {data.steps.goal.toLocaleString()} steps
          </Text>
        </View>

        {/* Workouts */}
        <View className="items-center">
          <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center">
            <Text className="text-primary text-2xl font-bold">
              {data.workoutSets}
            </Text>
          </View>
          <Text className="text-foreground font-semibold mt-3">
            {data.workoutSessions}
          </Text>
          <Text className="text-muted-foreground text-xs">
            workouts
          </Text>
        </View>
      </View>

      {/* Weight if available */}
      {data.weight !== null && (
        <View className="mt-4 pt-4 border-t border-border flex-row justify-center items-center">
          <Text className="text-muted-foreground">Today's Weight: </Text>
          <Text className="text-foreground font-semibold">
            {data.weight.toFixed(1)} kg
          </Text>
        </View>
      )}
    </View>
  );
}
