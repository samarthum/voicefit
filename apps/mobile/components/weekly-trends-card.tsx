import { useState } from "react";
import { View, Text, Dimensions, Pressable } from "react-native";
import { format, parseISO } from "date-fns";
import { Check } from "lucide-react-native";
import Svg, { Path, Circle, G } from "react-native-svg";
import type { DashboardData } from "@voicefit/shared/types";

import { Card } from "@/components/ui/card";

interface WeeklyTrendsCardProps {
  data: DashboardData["weeklyTrends"];
}

const screenWidth = Dimensions.get("window").width;
const CHART_WIDTH = screenWidth - 80;
const CHART_HEIGHT = 100;
const PADDING = 16;

type TabType = "calories" | "steps" | "workouts";

const tabConfig: Record<
  TabType,
  { label: string; color: string; unit: string }
> = {
  calories: { label: "Calories", color: "#f97316", unit: "kcal" },
  steps: { label: "Steps", color: "#22c55e", unit: "" },
  workouts: { label: "Workouts", color: "#16a34a", unit: "" },
};

function LineChart({
  data,
  color,
  maxValue,
}: {
  data: (number | null)[];
  color: string;
  maxValue: number;
}) {
  const effectiveWidth = CHART_WIDTH - PADDING * 2;
  const effectiveHeight = CHART_HEIGHT - PADDING * 2;
  const pointSpacing = effectiveWidth / (data.length - 1);

  // Generate path and points
  const points = data.map((value, index) => {
    const x = PADDING + index * pointSpacing;
    const normalizedValue = value ?? 0;
    const y =
      PADDING +
      effectiveHeight -
      (normalizedValue / maxValue) * effectiveHeight;
    return { x, y, value };
  });

  // Create SVG path
  let pathD = "";
  points.forEach((point, index) => {
    if (index === 0) {
      pathD += `M ${point.x} ${point.y}`;
    } else {
      // Bezier curve for smooth line
      const prev = points[index - 1];
      const cpx1 = prev.x + pointSpacing / 3;
      const cpy1 = prev.y;
      const cpx2 = point.x - pointSpacing / 3;
      const cpy2 = point.y;
      pathD += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${point.x} ${point.y}`;
    }
  });

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {/* Line */}
      <Path
        d={pathD}
        stroke={color}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dots */}
      <G>
        {points.map((point, index) => {
          const isLast = index === points.length - 1;
          return (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={isLast ? 6 : 4}
              fill={point.value ? color : "rgba(15, 23, 42, 0.1)"}
              stroke={isLast ? "#fff" : "transparent"}
              strokeWidth={isLast ? 2 : 0}
            />
          );
        })}
      </G>
    </Svg>
  );
}

function WorkoutDots({ data }: { data: number[] }) {
  return (
    <View className="flex-row justify-between py-4">
      {data.map((count, index) => {
        const hasWorkout = count > 0;
        return (
          <View
            key={index}
            className={`w-10 h-10 rounded-2xl border items-center justify-center ${
              hasWorkout
                ? "bg-primary/10 border-primary/30"
                : "bg-muted/40 border-border/60"
            }`}
          >
            {hasWorkout ? (
              <Check size={16} color="#16a34a" />
            ) : (
              <View className="w-2 h-2 rounded-full bg-muted" />
            )}
          </View>
        );
      })}
    </View>
  );
}

export function WeeklyTrendsCard({ data }: WeeklyTrendsCardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("calories");

  // Take last 7 days
  const lastWeek = data.slice(-7);

  const calorieData = lastWeek.map((d) => d.calories);
  const stepData = lastWeek.map((d) => d.steps);
  const workoutData = lastWeek.map((d) => d.workouts);

  const maxCalories = Math.max(...calorieData.filter(Boolean), 1);
  const maxSteps = Math.max(
    ...stepData.filter((s): s is number => s !== null),
    1
  );

  const dayLabels = lastWeek.map((d) => format(parseISO(d.date), "EEE"));

  const currentValue =
    activeTab === "calories"
      ? calorieData[calorieData.length - 1]
      : activeTab === "steps"
        ? stepData[stepData.length - 1]
        : workoutData[workoutData.length - 1];

  return (
    <Card className="border-border/60 bg-card/70">
      {/* Header */}
      <View className="px-6 pt-6 pb-4">
        <Text className="text-lg font-display text-foreground">
          Weekly Trends
        </Text>
        <Text className="text-xs text-muted-foreground font-sans">
          Last 7 days
        </Text>
      </View>

      {/* Tabs - Pill style with borders */}
      <View className="px-6 pb-4">
        <View className="flex-row rounded-full p-1 bg-card/70 border border-border/60 gap-1">
          {(Object.keys(tabConfig) as TabType[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 items-center justify-center rounded-full px-3 py-2 ${
                activeTab === tab ? "bg-card border border-border/60" : "bg-transparent"
              }`}
              style={
                activeTab === tab
                  ? {
                      shadowColor: "#0f172a",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08,
                      shadowRadius: 4,
                      elevation: 2,
                    }
                  : undefined
              }
            >
              <Text
                className={`text-sm font-sans-medium ${
                  activeTab === tab ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {tabConfig[tab].label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Current Value */}
      <View className="px-6 pb-2 flex-row items-baseline gap-2">
        <Text
          className="text-3xl font-sans-bold tabular-nums"
          style={{ color: tabConfig[activeTab].color }}
        >
          {currentValue?.toLocaleString() ?? "---"}
        </Text>
        {tabConfig[activeTab].unit && (
          <Text className="text-sm text-muted-foreground font-sans">
            {tabConfig[activeTab].unit}
          </Text>
        )}
        {activeTab === "workouts" && (
          <Text className="text-sm text-muted-foreground font-sans">
            sessions today
          </Text>
        )}
      </View>

      {/* Chart */}
      <View className="px-6 pb-2 items-center">
        {activeTab === "workouts" ? (
          <WorkoutDots data={workoutData} />
        ) : (
          <LineChart
            data={activeTab === "calories" ? calorieData : stepData}
            color={tabConfig[activeTab].color}
            maxValue={activeTab === "calories" ? maxCalories : maxSteps}
          />
        )}
      </View>

      {/* Day Labels */}
      <View className="px-6 pb-6 flex-row justify-between">
        {dayLabels.map((label, index) => (
          <Text
            key={index}
            className="text-xs text-muted-foreground font-sans"
            style={{ width: CHART_WIDTH / 7, textAlign: "center" }}
          >
            {label}
          </Text>
        ))}
      </View>
    </Card>
  );
}
