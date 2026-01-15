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
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const todayKey = new Date().toLocaleDateString("en-CA");
  const filteredData = data.filter((d) => d.date !== todayKey);

  const chartData = filteredData.map((d) => ({
    ...d,
    displayDate: formatDate(d.date),
    calorieDelta: d.calories - calorieGoal,
  }));

  const maxDelta = Math.max(
    250,
    ...chartData.map((d) => Math.abs(d.calorieDelta))
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
    backgroundColor: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "12px",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
    padding: "8px 12px",
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-tl from-secondary/10 to-transparent blur-3xl pointer-events-none" />

      <CardHeader className="pb-2 relative">
        <CardTitle className="text-xl font-display">Weekly Trends</CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <Tabs defaultValue="calories" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="calories">Cal</TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="weight">Weight</TabsTrigger>
            <TabsTrigger value="workouts">Gym</TabsTrigger>
          </TabsList>

          <TabsContent value="calories" className="mt-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
                    {chartData.map((entry) => (
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

          <TabsContent value="steps" className="mt-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                    formatter={(value) => [
                      value ? Number(value).toLocaleString() : "---",
                      "Steps",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="steps"
                    stroke="var(--color-secondary-foreground)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-secondary-foreground)", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "var(--color-secondary-foreground)" }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="weight" className="mt-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                    formatter={(value) => [
                      value ? `${value} kg` : "---",
                      "Weight",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--color-accent-foreground)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-accent-foreground)", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "var(--color-accent-foreground)" }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="workouts" className="mt-4">
            <div className="grid grid-cols-7 gap-2">
              {chartData.map((entry) => {
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
                          ? "border-emerald-200 bg-emerald-100 text-emerald-700"
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
