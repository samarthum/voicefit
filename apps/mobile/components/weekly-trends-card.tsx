import { View, Text, Dimensions } from "react-native";
import { format, parseISO } from "date-fns";
import type { DashboardData } from "@voicefit/shared/types";

interface WeeklyTrendsCardProps {
  data: DashboardData["weeklyTrends"];
}

const screenWidth = Dimensions.get("window").width;

function MiniChart({
  data,
  color,
  maxValue,
}: {
  data: (number | null)[];
  color: string;
  maxValue: number;
}) {
  const chartHeight = 60;
  const chartWidth = screenWidth - 80; // Account for padding
  const barWidth = (chartWidth / data.length) - 4;

  return (
    <View className="flex-row items-end justify-between" style={{ height: chartHeight }}>
      {data.map((value, index) => {
        const height = value ? (value / maxValue) * chartHeight : 2;
        return (
          <View
            key={index}
            style={{
              width: barWidth,
              height: Math.max(height, 2),
              backgroundColor: value ? color : "#e5e7eb",
              borderRadius: 2,
            }}
          />
        );
      })}
    </View>
  );
}

export function WeeklyTrendsCard({ data }: WeeklyTrendsCardProps) {
  // Take last 7 days
  const lastWeek = data.slice(-7);

  const calorieData = lastWeek.map((d) => d.calories);
  const stepData = lastWeek.map((d) => d.steps);
  const workoutData = lastWeek.map((d) => d.workouts);

  const maxCalories = Math.max(...calorieData.filter(Boolean), 1);
  const maxSteps = Math.max(...stepData.filter((s): s is number => s !== null), 1);
  const maxWorkouts = Math.max(...workoutData, 1);

  const dayLabels = lastWeek.map((d) => format(parseISO(d.date), "EEE"));

  return (
    <View className="bg-card border border-border rounded-2xl p-5 mt-4">
      <Text className="text-foreground font-semibold text-lg mb-4">
        Weekly Trends
      </Text>

      {/* Calories Chart */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-muted-foreground text-sm">Calories</Text>
          <Text className="text-foreground text-sm font-medium">
            {calorieData[calorieData.length - 1]?.toLocaleString() ?? 0} kcal
          </Text>
        </View>
        <MiniChart data={calorieData} color="#3b82f6" maxValue={maxCalories} />
      </View>

      {/* Steps Chart */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-muted-foreground text-sm">Steps</Text>
          <Text className="text-foreground text-sm font-medium">
            {stepData[stepData.length - 1]?.toLocaleString() ?? 0}
          </Text>
        </View>
        <MiniChart data={stepData} color="#f59e0b" maxValue={maxSteps} />
      </View>

      {/* Workouts Chart */}
      <View className="mb-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-muted-foreground text-sm">Workouts</Text>
          <Text className="text-foreground text-sm font-medium">
            {workoutData[workoutData.length - 1] ?? 0} sessions
          </Text>
        </View>
        <MiniChart data={workoutData} color="#22c55e" maxValue={maxWorkouts || 1} />
      </View>

      {/* Day Labels */}
      <View className="flex-row justify-between px-1">
        {dayLabels.map((label, index) => (
          <Text key={index} className="text-muted-foreground text-xs">
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
