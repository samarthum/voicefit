import { useMemo, useState } from "react";
import { View, Text, Dimensions, Pressable } from "react-native";
import { format, parseISO } from "date-fns";
import { Check } from "lucide-react-native";
import Svg, { Path, Circle, Line as SvgLine } from "react-native-svg";
import type { DashboardData } from "@voicefit/shared/types";

import { Card } from "@/components/ui/card";

interface WeeklyTrendsCardProps {
  data: DashboardData["weeklyTrends"];
  calorieGoal: number;
}

const screenWidth = Dimensions.get("window").width;
const CHART_WIDTH = screenWidth - 80;
const CHART_HEIGHT = 180;
const CHART_PADDING = 16;
const AXIS_LABEL_WIDTH = 46;
const PLOT_WIDTH = Math.max(CHART_WIDTH - AXIS_LABEL_WIDTH, 0);
const CELL_GAP = 8;

type TabType = "calories" | "steps" | "weight" | "workouts";

const tabConfig: Record<
  TabType,
  {
    label: string;
    color: string;
    unit: string;
    activeBg: string;
    activeBorder: string;
  }
> = {
  calories: {
    label: "Calories",
    color: "#f97316",
    unit: "kcal",
    activeBg: "rgba(249, 115, 22, 0.12)",
    activeBorder: "rgba(249, 115, 22, 0.4)",
  },
  steps: {
    label: "Steps",
    color: "#22c55e",
    unit: "",
    activeBg: "rgba(34, 197, 94, 0.12)",
    activeBorder: "rgba(34, 197, 94, 0.4)",
  },
  weight: {
    label: "Weight",
    color: "#1d4ed8",
    unit: "kg",
    activeBg: "rgba(29, 78, 216, 0.12)",
    activeBorder: "rgba(29, 78, 216, 0.4)",
  },
  workouts: {
    label: "Workouts",
    color: "#16a34a",
    unit: "",
    activeBg: "rgba(168, 85, 247, 0.12)",
    activeBorder: "rgba(168, 85, 247, 0.4)",
  },
};

function buildTicks(min: number, max: number, count: number) {
  if (count <= 1 || min === max) return [max];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => max - i * step);
}

function LineChart({
  data,
  color,
  minValue,
  maxValue,
  ticks,
  formatTick,
  goalValue,
}: {
  data: (number | null)[];
  color: string;
  minValue: number;
  maxValue: number;
  ticks: number[];
  formatTick: (value: number) => string;
  goalValue?: number;
}) {
  const pointSpacing = data.length > 1 ? PLOT_WIDTH / (data.length - 1) : 0;
  const effectiveHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const valueRange = maxValue - minValue || 1;

  const points = data
    .map((value, index) => {
      if (value == null) return null;
      const x = CHART_PADDING + index * pointSpacing;
      const normalized = (value - minValue) / valueRange;
      const y = CHART_PADDING + effectiveHeight - normalized * effectiveHeight;
      return { x, y, value };
    })
    .filter(Boolean) as { x: number; y: number; value: number }[];

  let pathD = "";
  points.forEach((point, index) => {
    if (index === 0) {
      pathD += `M ${point.x} ${point.y}`;
      return;
    }
    const prev = points[index - 1];
    const cpx1 = prev.x + pointSpacing / 3;
    const cpy1 = prev.y;
    const cpx2 = point.x - pointSpacing / 3;
    const cpy2 = point.y;
    pathD += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${point.x} ${point.y}`;
  });

  const lastPointIndex = points.length - 1;

  const goalY =
    goalValue !== undefined
      ? CHART_PADDING +
        effectiveHeight -
        ((goalValue - minValue) / valueRange) * effectiveHeight
      : null;

  return (
    <View className="flex-row">
      <View
        style={{
          width: AXIS_LABEL_WIDTH,
          height: CHART_HEIGHT,
          paddingVertical: CHART_PADDING,
          justifyContent: "space-between",
        }}
      >
        {ticks.map((tick) => (
          <Text
            key={tick}
            className="text-[11px] text-muted-foreground font-sans"
            style={{ textAlign: "right" }}
          >
            {formatTick(tick)}
          </Text>
        ))}
      </View>
      <Svg width={PLOT_WIDTH} height={CHART_HEIGHT}>
        {goalY !== null && (
          <SvgLine
            x1={CHART_PADDING}
            x2={PLOT_WIDTH - CHART_PADDING}
            y1={goalY}
            y2={goalY}
            stroke="rgba(15, 23, 42, 0.2)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        )}
        {points.length > 1 && (
          <Path
            d={pathD}
            stroke={color}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {points.map((point, index) => (
          <Circle
            key={`${point.x}-${point.y}`}
            cx={point.x}
            cy={point.y}
            r={index === lastPointIndex ? 6 : 4}
            fill={color}
            stroke={index === lastPointIndex ? "#ffffff" : "transparent"}
            strokeWidth={index === lastPointIndex ? 2 : 0}
          />
        ))}
      </Svg>
    </View>
  );
}

function WorkoutGrid({
  data,
  dayLabels,
}: {
  data: number[];
  dayLabels: string[];
}) {
  if (dayLabels.length === 0) {
    return null;
  }
  const cellWidth =
    (CHART_WIDTH - CELL_GAP * (dayLabels.length - 1)) / dayLabels.length;

  return (
    <View className="flex-row" style={{ width: CHART_WIDTH }}>
      {data.map((count, index) => {
        const hasWorkout = count > 0;
        const isLast = index === data.length - 1;
        return (
          <View
            key={index}
            style={{ width: cellWidth, marginRight: isLast ? 0 : CELL_GAP }}
            className="items-center rounded-2xl border border-border/60 px-2 py-3"
          >
            <Text className="text-xs text-muted-foreground font-sans">
              {dayLabels[index]}
            </Text>
            <View
              className={`mt-2 h-8 w-8 items-center justify-center rounded-full border ${
                hasWorkout
                  ? "border-success/60 bg-success/15"
                  : "border-border/70 bg-muted/60"
              }`}
            >
              {hasWorkout ? (
                <Check size={16} color="#22c55e" />
              ) : (
                <Text className="text-xs text-muted-foreground font-sans">-</Text>
              )}
            </View>
            <Text className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground font-sans">
              {hasWorkout ? "Done" : "Rest"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function WeeklyTrendsCard({ data, calorieGoal }: WeeklyTrendsCardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("calories");

  const todayKey =
    data[data.length - 1]?.date ?? new Date().toLocaleDateString("en-CA");
  const todayData = data.find((entry) => entry.date === todayKey);

  const completedDaysData = data.filter((entry) => entry.date !== todayKey).slice(-7);
  const last7DaysData = data.slice(-7);

  const calorieChartData = completedDaysData.length
    ? completedDaysData
    : last7DaysData;
  const stepsChartData = completedDaysData.length ? completedDaysData : last7DaysData;
  const weightChartData =
    todayData?.weight != null ? last7DaysData : completedDaysData.length ? completedDaysData : last7DaysData;
  const workoutsChartData = last7DaysData;

  const chartData =
    activeTab === "calories"
      ? calorieChartData
      : activeTab === "steps"
        ? stepsChartData
        : activeTab === "weight"
          ? weightChartData
          : workoutsChartData;

  const dayLabels = chartData.map((entry) => format(parseISO(entry.date), "EEE"));

  const calorieValues = calorieChartData.map((entry) => entry.calories);
  const calorieMin = Math.min(0, calorieGoal, ...calorieValues);
  const calorieMax = Math.max(calorieGoal, ...calorieValues);
  const caloriePadding = Math.max(150, Math.round((calorieMax - calorieMin) * 0.15));
  const calorieDomainMin = Math.max(0, calorieMin - caloriePadding);
  const calorieDomainMax = calorieMax + caloriePadding;
  const calorieTicks = buildTicks(calorieDomainMin, calorieDomainMax, 4);

  const stepValues = stepsChartData
    .map((entry) => entry.steps)
    .filter((value): value is number => value != null);
  const stepMax = stepValues.length ? Math.max(...stepValues) : 1;
  const stepPadding = Math.max(500, Math.round(stepMax * 0.15));
  const stepDomainMin = 0;
  const stepDomainMax = stepMax + stepPadding;
  const stepTicks = buildTicks(stepDomainMin, stepDomainMax, 4);

  const weightValues = weightChartData
    .map((entry) => entry.weight)
    .filter((value): value is number => value != null);
  const weightStep = 0.5;
  const weightPadding = 0.5;
  const weightMin = weightValues.length ? Math.min(...weightValues) : 0;
  const weightMax = weightValues.length ? Math.max(...weightValues) : weightMin + weightStep;
  const weightDomainMin =
    Math.floor((weightMin - weightPadding) / weightStep) * weightStep;
  const weightDomainMax =
    Math.ceil((weightMax + weightPadding) / weightStep) * weightStep;
  const weightTicks: number[] = [];
  for (let value = weightDomainMax; value >= weightDomainMin - 0.001; value -= weightStep) {
    weightTicks.push(Number(value.toFixed(1)));
  }

  const chartProps = useMemo(() => {
    if (activeTab === "calories") {
      return {
        data: calorieChartData.map((entry) => entry.calories),
        color: tabConfig.calories.color,
        minValue: calorieDomainMin,
        maxValue: calorieDomainMax,
        ticks: calorieTicks,
        formatTick: (value: number) => Math.round(value).toLocaleString(),
        goalValue: calorieGoal,
      };
    }
    if (activeTab === "steps") {
      return {
        data: stepsChartData.map((entry) => entry.steps),
        color: tabConfig.steps.color,
        minValue: stepDomainMin,
        maxValue: stepDomainMax,
        ticks: stepTicks,
        formatTick: (value: number) => Math.round(value).toLocaleString(),
        goalValue: undefined,
      };
    }
    return {
      data: weightChartData.map((entry) => entry.weight),
      color: tabConfig.weight.color,
      minValue: weightDomainMin,
      maxValue: weightDomainMax,
      ticks: weightTicks,
      formatTick: (value: number) => value.toFixed(1),
      goalValue: undefined,
    };
  }, [
    activeTab,
    calorieChartData,
    stepsChartData,
    weightChartData,
    calorieDomainMin,
    calorieDomainMax,
    calorieTicks,
    calorieGoal,
    stepDomainMin,
    stepDomainMax,
    stepTicks,
    weightDomainMin,
    weightDomainMax,
    weightTicks,
  ]);

  return (
    <Card className="border-border/60 bg-card/70">
      <View
        className="absolute -bottom-24 -right-16 w-40 h-40 rounded-full"
        style={{ backgroundColor: "rgba(16, 185, 129, 0.12)" }}
        pointerEvents="none"
      />
      <View className="px-6 pt-6 pb-4">
        <Text className="text-lg font-display text-foreground">Weekly Trends</Text>
      </View>

      <View className="px-6 pb-4">
        <View className="flex-row rounded-full p-1 bg-card/70 border border-border/60 gap-1">
          {(Object.keys(tabConfig) as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className="flex-1 items-center justify-center rounded-full px-3 py-1.5 border"
                style={
                  isActive
                    ? {
                        backgroundColor: tabConfig[tab].activeBg,
                        borderColor: tabConfig[tab].activeBorder,
                        shadowColor: "#0f172a",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        elevation: 2,
                      }
                    : { borderColor: "rgba(15, 23, 42, 0.12)" }
                }
              >
                <Text
                  className={`text-xs font-sans-medium ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {tabConfig[tab].label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="px-6 pb-2">
        {activeTab === "workouts" ? (
          <WorkoutGrid
            data={workoutsChartData.map((entry) => entry.workouts)}
            dayLabels={dayLabels}
          />
        ) : (
          <LineChart {...chartProps} />
        )}
      </View>

      {activeTab === "calories" && (
        <Text className="px-6 pb-2 text-xs text-muted-foreground font-sans">
          Dotted line shows your daily calorie target.
        </Text>
      )}

      {activeTab !== "workouts" && (
        <View className="px-6 pb-6">
          <View style={{ marginLeft: AXIS_LABEL_WIDTH }} className="flex-row">
            {dayLabels.map((label, index) => (
              <Text
                key={`${label}-${index}`}
                className="text-xs text-muted-foreground font-sans"
                style={{
                  width: dayLabels.length ? PLOT_WIDTH / dayLabels.length : PLOT_WIDTH,
                  textAlign: "center",
                }}
              >
                {label}
              </Text>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}
