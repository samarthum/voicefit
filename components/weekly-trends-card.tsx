"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WeeklyTrendsCardProps {
  data: {
    date: string;
    calories: number;
    steps: number | null;
    weight: number | null;
    workouts: number;
  }[];
}

export function WeeklyTrendsCard({ data }: WeeklyTrendsCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const chartData = data.map((d) => ({
    ...d,
    displayDate: formatDate(d.date),
  }));

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
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value} kcal`, "Calories"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="calories"
                    stroke="var(--color-primary)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-primary)", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "var(--color-primary)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
                    width={30}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [
                      `${value} session${value !== 1 ? "s" : ""}`,
                      "Workouts",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="workouts"
                    stroke="var(--color-primary)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-primary)", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "var(--color-primary)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
