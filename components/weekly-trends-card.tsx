"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bar,
  BarChart,
  LineChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

  const todayKey = new Date().toLocaleDateString("en-CA");
  const todayData = data.find((d) => d.date === todayKey);

  // Calories & Steps: exclude today (last 7 completed days)
  const completedDaysData = data.filter((d) => d.date !== todayKey);

  // Weight: include today only if weight was entered
  const weightData = todayData?.weight != null
    ? data
    : completedDaysData;

  // Workouts: show all days including today
  const workoutsData = data;

  const calorieChartData = completedDaysData.map((d) => ({
    ...d,
    displayDate: formatDate(d.date),
    calorieDelta: d.calories - calorieGoal,
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

  const maxDelta = Math.max(
    250,
    ...calorieChartData.map((d) => Math.abs(d.calorieDelta))
  );
  const calorieDomain = [-maxDelta * 1.1, maxDelta * 1.1] as [number, number];
  const calorieTicks = [
    -maxDelta,
    -Math.round(maxDelta / 2),
    0,
    Math.round(maxDelta / 2),
    maxDelta,
  ];

  const tooltipStyle = {
    backgroundColor: "#1a1a1d",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "12px",
    boxShadow: "0 10px 40px -5px rgba(0,0,0,0.5)",
    padding: "8px 12px",
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
                <BarChart data={calorieChartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                    domain={calorieDomain}
                    ticks={calorieTicks}
                    tickFormatter={(value) =>
                      `${value > 0 ? "+" : ""}${value.toLocaleString()}`
                    }
                  />
                  <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="3 3" />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "#fafafa", fontWeight: 500 }}
                    itemStyle={{ color: "#a1a1aa" }}
                    cursor={{ fill: "rgba(255, 255, 255, 0.08)" }}
                    formatter={(value) => {
                      const numericValue = Number(value);
                      const label = numericValue > 0 ? "Over target" : "Under target";
                      return [
                        `${numericValue > 0 ? "+" : ""}${numericValue} kcal`,
                        label,
                      ];
                    }}
                  />
                  <Bar dataKey="calorieDelta" radius={[6, 6, 6, 6]}>
                    {calorieChartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.date}`}
                        fill={
                          entry.calorieDelta > 0
                            ? "var(--color-destructive)"
                            : "var(--color-success)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Bars show calories over (red) or under (green) your target.
            </p>
          </TabsContent>

          <TabsContent value="steps" className="mt-4 border-0">
            <div className="h-[200px] [&_*]:border-0 [&_*]:outline-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stepsChartData}>
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
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
                <LineChart data={weightChartData}>
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    domain={["dataMin - 1", "dataMax + 1"]}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ stroke: "transparent" }}
                    formatter={(value) => [
                      value ? `${value} kg` : "---",
                      "Weight",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--color-secondary)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-secondary)", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "var(--color-secondary)" }}
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
                          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                          : "border-border/60 bg-muted/40 text-muted-foreground"
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
