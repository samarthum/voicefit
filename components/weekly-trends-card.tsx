"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Check } from "lucide-react";

interface WeeklyTrendsCardProps {
  data: {
    date: string;
    calories: number;
    steps: number | null;
    weight: number | null;
    workouts: number;
  }[];
  calorieGoal: number;
}

export function WeeklyTrendsCard({ data, calorieGoal }: WeeklyTrendsCardProps) {
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const todayKey = data[data.length - 1]?.date ?? new Date().toLocaleDateString("en-CA");
  const todayData = data.find((d) => d.date === todayKey);

  const completedDaysData = data.filter((d) => d.date !== todayKey).slice(-7);
  const last7DaysData = data.slice(-7);

  // Weight: include today only if weight was entered
  const weightData = todayData?.weight != null
    ? last7DaysData
    : completedDaysData;

  // Workouts: show last 7 days including today
  const workoutsData = last7DaysData;

  const calorieChartData = completedDaysData.map((d) => ({
    ...d,
    displayDate: formatDate(d.date),
  }));

  const stepsChartData = completedDaysData.map((d) => ({
    ...d,
    displayDate: formatDate(d.date),
  }));

  const weightChartData = weightData.map((d) => ({
    ...d,
    displayDate: formatDate(d.date),
  }));

  const workoutsChartData = workoutsData.map((d) => ({
    ...d,
    displayDate: formatDate(d.date),
  }));

  const weightValues = weightChartData
    .map((d) => d.weight)
    .filter((value): value is number => value != null);
  const weightStep = 0.5;
  const weightPadding = 0.5;
  const weightMin = weightValues.length
    ? Math.min(...weightValues)
    : 0;
  const weightMax = weightValues.length
    ? Math.max(...weightValues)
    : weightMin + weightStep;
  const weightDomainMin = Math.floor((weightMin - weightPadding) / weightStep) * weightStep;
  const weightDomainMax = Math.ceil((weightMax + weightPadding) / weightStep) * weightStep;
  const weightTicks: number[] = [];
  for (let value = weightDomainMin; value <= weightDomainMax + 0.001; value += weightStep) {
    weightTicks.push(Number(value.toFixed(1)));
  }

  const calorieValues = calorieChartData.map((d) => d.calories);
  const calorieMin = Math.min(0, calorieGoal, ...calorieValues);
  const calorieMax = Math.max(calorieGoal, ...calorieValues);
  const caloriePadding = Math.max(150, Math.round((calorieMax - calorieMin) * 0.15));
  const calorieDomain = [
    Math.max(0, calorieMin - caloriePadding),
    calorieMax + caloriePadding,
  ] as [number, number];

  const tooltipStyle = {
    backgroundColor: "#f8fafc",
    border: "1px solid rgba(15, 23, 42, 0.12)",
    borderRadius: "12px",
    boxShadow: "0 10px 40px -5px rgba(15, 23, 42, 0.2)",
    padding: "8px 12px",
    color: "#1f2937",
  };

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/70">
      <div className="absolute -bottom-24 -right-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <CardHeader className="pb-2 relative">
        <CardTitle className="text-xl font-display">Weekly Trends</CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <Tabs defaultValue="calories" className="w-full">
          <TabsList className="flex w-full flex-wrap items-center gap-2 bg-transparent p-0">
            <TabsTrigger
              value="calories"
              className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground data-[state=active]:border-orange-500/40 data-[state=active]:bg-orange-500/10 data-[state=active]:text-foreground"
            >
              Calories
            </TabsTrigger>
            <TabsTrigger
              value="steps"
              className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground data-[state=active]:border-emerald-500/40 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-foreground"
            >
              Steps
            </TabsTrigger>
            <TabsTrigger
              value="weight"
              className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground data-[state=active]:border-blue-500/40 data-[state=active]:bg-blue-500/10 data-[state=active]:text-foreground"
            >
              Weight
            </TabsTrigger>
            <TabsTrigger
              value="workouts"
              className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground data-[state=active]:border-purple-500/40 data-[state=active]:bg-purple-500/10 data-[state=active]:text-foreground"
            >
              Workouts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calories" className="mt-4 border-0">
            <div className="h-[200px] [&_*]:border-0 [&_*]:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calorieChartData} margin={{ top: 8, right: 8, bottom: 12, left: 8 }}>
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    domain={calorieDomain}
                    tickMargin={12}
                    tickFormatter={(value) =>
                      `${Number(value).toLocaleString()}`
                    }
                  />
                  <ReferenceLine
                    y={calorieGoal}
                    stroke="var(--color-border)"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "#1f2937", fontWeight: 600 }}
                    itemStyle={{ color: "#6b7280" }}
                    cursor={{ stroke: "transparent" }}
                    formatter={(value) => [
                      `${Number(value).toLocaleString()} kcal`,
                      "Calories",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="calories"
                    stroke="var(--color-accent)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-accent)", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "var(--color-accent)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Dotted line shows your daily calorie target.
            </p>
          </TabsContent>

          <TabsContent value="steps" className="mt-4 border-0">
            <div className="h-[200px] [&_*]:border-0 [&_*]:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stepsChartData} margin={{ top: 8, right: 8, bottom: 12, left: 8 }}>
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tickMargin={12}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "#1f2937", fontWeight: 600 }}
                    itemStyle={{ color: "#6b7280" }}
                    cursor={{ stroke: "transparent" }}
                    formatter={(value) => [
                      value ? Number(value).toLocaleString() : "---",
                      "Steps",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="steps"
                    stroke="var(--color-success)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-success)", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "var(--color-success)" }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="weight" className="mt-4 border-0">
            <div className="h-[200px] [&_*]:border-0 [&_*]:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData} margin={{ top: 8, right: 8, bottom: 12, left: 8 }}>
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    domain={[weightDomainMin, weightDomainMax]}
                    ticks={weightTicks}
                    tickMargin={12}
                    tickFormatter={(value) =>
                      Number(value).toLocaleString("en-US", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })
                    }
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "#1f2937", fontWeight: 600 }}
                    itemStyle={{ color: "#6b7280" }}
                    cursor={{ stroke: "transparent" }}
                    formatter={(value) => [
                      value ? `${value} kg` : "---",
                      "Weight",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#1d4ed8"
                    strokeWidth={3}
                    dot={{ fill: "#1d4ed8", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "#1d4ed8" }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="workouts" className="mt-4 border-0">
            <div className="grid grid-cols-7 gap-2">
              {workoutsChartData.map((entry) => {
                const hasWorkout = entry.workouts > 0;
                return (
                  <div
                    key={entry.date}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 px-2 py-3"
                  >
                    <span className="text-xs text-muted-foreground">{entry.displayDate}</span>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                        hasWorkout
                          ? "border-emerald-600/60 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "border-border/70 bg-muted/60 text-muted-foreground"
                      }`}
                    >
                      {hasWorkout ? <Check className="h-4 w-4" /> : <span className="text-xs">—</span>}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {hasWorkout ? "Done" : "Rest"}
                    </span>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
