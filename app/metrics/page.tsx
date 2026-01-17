"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { Loader2, Footprints, Scale } from "lucide-react";
import { toast, Toaster } from "sonner";
import { getTodayDateString } from "@/lib/timezone";

interface DailyMetric {
  date: string;
  steps: number | null;
  weightKg: number | null;
}

export default function MetricsPage() {
  return (
    <Suspense fallback={<MetricsPageSkeleton />}>
      <MetricsPageContent />
    </Suspense>
  );
}

function MetricsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Daily Metrics</h1>
        </div>
      </header>
      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </main>
      <BottomNav />
    </div>
  );
}

function MetricsPageContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "steps";

  const [_todayMetric, setTodayMetric] = useState<DailyMetric | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<DailyMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [steps, setSteps] = useState("");
  const [weight, setWeight] = useState("");
  const [selectedStepsDate, setSelectedStepsDate] = useState(getTodayDateString());
  const [selectedWeightDate, setSelectedWeightDate] = useState(getTodayDateString());

  const today = getTodayDateString();

  const fetchMetrics = useCallback(async () => {
    try {
      try {
        await fetch(`/api/fitbit/sync?date=${encodeURIComponent(today)}`);
      } catch (error) {
        console.error("Fitbit sync error:", error);
      }

      const [todayRes, historyRes] = await Promise.all([
        fetch(`/api/daily-metrics/${today}`),
        fetch("/api/daily-metrics?limit=7"),
      ]);

      const todayResult = await todayRes.json();
      const historyResult = await historyRes.json();

      if (todayResult.success) {
        setTodayMetric(todayResult.data);
        setSteps(todayResult.data.steps?.toString() || "");
        setWeight(todayResult.data.weightKg?.toString() || "");
      }

      if (historyResult.success) {
        setRecentMetrics(historyResult.data);
      }
    } catch (error) {
      console.error("Metrics fetch error:", error);
      toast.error("Failed to load metrics");
    } finally {
      setIsLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Fetch data for selected steps date
  useEffect(() => {
    const fetchStepsData = async () => {
      try {
        const response = await fetch(`/api/daily-metrics/${selectedStepsDate}`);
        const result = await response.json();
        if (result.success && result.data) {
          setSteps(result.data.steps?.toString() || "");
        } else {
          setSteps("");
        }
      } catch (error) {
        console.error("Error fetching steps data:", error);
      }
    };
    fetchStepsData();
  }, [selectedStepsDate]);

  // Fetch data for selected weight date
  useEffect(() => {
    const fetchWeightData = async () => {
      try {
        const response = await fetch(`/api/daily-metrics/${selectedWeightDate}`);
        const result = await response.json();
        if (result.success && result.data) {
          setWeight(result.data.weightKg?.toString() || "");
        } else {
          setWeight("");
        }
      } catch (error) {
        console.error("Error fetching weight data:", error);
      }
    };
    fetchWeightData();
  }, [selectedWeightDate]);

  const handleSaveSteps = async () => {
    const stepsValue = parseInt(steps);
    if (isNaN(stepsValue) || stepsValue < 0) {
      toast.error("Please enter a valid number of steps");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/daily-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedStepsDate, steps: stepsValue }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Steps saved!");
        if (selectedStepsDate === today) {
          setTodayMetric((prev) => ({ ...prev!, steps: stepsValue }));
        }
        // Refresh recent metrics to show the update
        const historyRes = await fetch("/api/daily-metrics?limit=7");
        const historyResult = await historyRes.json();
        if (historyResult.success) {
          setRecentMetrics(historyResult.data);
        }
      } else {
        toast.error(result.error || "Failed to save steps");
      }
    } catch (error) {
      console.error("Save steps error:", error);
      toast.error("Failed to save steps");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWeight = async () => {
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue < 20 || weightValue > 300) {
      toast.error("Please enter a valid weight (20-300 kg)");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/daily-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedWeightDate, weightKg: weightValue }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Weight saved!");
        if (selectedWeightDate === today) {
          setTodayMetric((prev) => ({ ...prev!, weightKg: weightValue }));
        }
        // Refresh recent metrics to show the update
        const historyRes = await fetch("/api/daily-metrics?limit=7");
        const historyResult = await historyRes.json();
        if (historyResult.success) {
          setRecentMetrics(historyResult.data);
        }
      } else {
        toast.error(result.error || "Failed to save weight");
      }
    } catch (error) {
      console.error("Save weight error:", error);
      toast.error("Failed to save weight");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <Toaster />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Daily Metrics</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <>
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </>
        ) : (
          <Tabs defaultValue={defaultTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="steps">
                <Footprints className="h-4 w-4 mr-2" />
                Steps
              </TabsTrigger>
              <TabsTrigger value="weight">
                <Scale className="h-4 w-4 mr-2" />
                Weight
              </TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="steps-date">Date</Label>
                    <Input
                      id="steps-date"
                      type="date"
                      value={selectedStepsDate}
                      onChange={(e) => setSelectedStepsDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="steps">Steps</Label>
                    <Input
                      id="steps"
                      type="number"
                      min="0"
                      placeholder="e.g., 10000"
                      value={steps}
                      onChange={(e) => setSteps(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSaveSteps}
                    disabled={isSaving || !steps}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Steps"
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Recent History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent History</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentMetrics.filter((m) => m.steps).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No step data yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {recentMetrics
                        .filter((m) => m.steps)
                        .map((metric) => (
                          <div
                            key={metric.date}
                            className="flex justify-between py-2 border-b last:border-b-0"
                          >
                            <span className="text-sm text-muted-foreground">
                              {metric.date}
                            </span>
                            <span className="text-sm font-medium">
                              {metric.steps?.toLocaleString()} steps
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="weight" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weight</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight-date">Date</Label>
                    <Input
                      id="weight-date"
                      type="date"
                      value={selectedWeightDate}
                      onChange={(e) => setSelectedWeightDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="20"
                      max="300"
                      step="0.1"
                      placeholder="e.g., 75.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSaveWeight}
                    disabled={isSaving || !weight}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Weight"
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Recent History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent History</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentMetrics.filter((m) => m.weightKg).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No weight data yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {recentMetrics
                        .filter((m) => m.weightKg)
                        .map((metric) => (
                          <div
                            key={metric.date}
                            className="flex justify-between py-2 border-b last:border-b-0"
                          >
                            <span className="text-sm text-muted-foreground">
                              {metric.date}
                            </span>
                            <span className="text-sm font-medium">
                              {metric.weightKg} kg
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
