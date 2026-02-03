"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { Activity, Loader2, Moon, Sun, Target, User } from "lucide-react";
import { toast, Toaster } from "sonner";

interface FitbitStatus {
  connected: boolean;
  lastSyncAt: string | null;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-40 bg-gradient-to-b from-background/90 via-background/80 to-background/70 backdrop-blur-sm border-b border-border/60">
        <div className="flex h-16 items-center justify-between px-4 max-w-lg mx-auto">
          <h1 className="text-lg font-display text-foreground">Settings</h1>
        </div>
      </header>
      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-[280px] w-full rounded-2xl" />
        <Skeleton className="h-[180px] w-full rounded-2xl" />
        <Skeleton className="h-[140px] w-full rounded-2xl" />
      </main>
      <BottomNav />
    </div>
  );
}

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fitbitStatus, setFitbitStatus] = useState<FitbitStatus | null>(null);
  const [isFitbitLoading, setIsFitbitLoading] = useState(true);
  const [isFitbitDisconnecting, setIsFitbitDisconnecting] = useState(false);
  const [isThemeMounted, setIsThemeMounted] = useState(false);

  const [calorieGoal, setCalorieGoal] = useState("");
  const [stepGoal, setStepGoal] = useState("");
  const { theme, setTheme } = useTheme();

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/user/settings");
      const result = await response.json();

      if (result.success) {
        setCalorieGoal(result.data.calorieGoal.toString());
        setStepGoal(result.data.stepGoal.toString());
      } else {
        toast.error("Failed to load settings");
      }
    } catch (error) {
      console.error("Settings fetch error:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFitbitStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/fitbit/status");
      const result = await response.json();

      if (result.success) {
        setFitbitStatus(result.data);
      } else {
        toast.error("Failed to load Fitbit status");
      }
    } catch (error) {
      console.error("Fitbit status error:", error);
      toast.error("Failed to load Fitbit status");
    } finally {
      setIsFitbitLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchFitbitStatus();
  }, [fetchSettings, fetchFitbitStatus]);

  useEffect(() => {
    setIsThemeMounted(true);
  }, []);

  useEffect(() => {
    const fitbitStatusParam = searchParams.get("fitbit");
    if (!fitbitStatusParam) {
      return;
    }

    if (fitbitStatusParam === "connected") {
      toast.success("Fitbit connected!");
      fetchFitbitStatus();
    } else if (fitbitStatusParam === "missing-scope") {
      toast.error("Fitbit needs activity permission to sync steps");
    } else if (fitbitStatusParam === "invalid") {
      toast.error("Fitbit connection expired. Please try again.");
    } else {
      toast.error("Fitbit connection failed");
    }
  }, [fetchFitbitStatus, searchParams]);

  const handleSave = async () => {
    const calorieValue = parseInt(calorieGoal);
    const stepValue = parseInt(stepGoal);

    if (isNaN(calorieValue) || calorieValue < 500 || calorieValue > 10000) {
      toast.error("Please enter a valid calorie goal (500-10000)");
      return;
    }

    if (isNaN(stepValue) || stepValue < 1000 || stepValue > 100000) {
      toast.error("Please enter a valid step goal (1000-100000)");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calorieGoal: calorieValue,
          stepGoal: stepValue,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Settings saved!");
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Save settings error:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectFitbit = () => {
    window.location.href = "/api/fitbit/connect";
  };

  const handleDisconnectFitbit = async () => {
    setIsFitbitDisconnecting(true);
    try {
      const response = await fetch("/api/fitbit/disconnect", {
        method: "POST",
      });
      const result = await response.json();

      if (result.success) {
        toast.success("Fitbit disconnected");
        fetchFitbitStatus();
      } else {
        toast.error(result.error || "Failed to disconnect Fitbit");
      }
    } catch (error) {
      console.error("Fitbit disconnect error:", error);
      toast.error("Failed to disconnect Fitbit");
    } finally {
      setIsFitbitDisconnecting(false);
    }
  };

  const fitbitLastSync = fitbitStatus?.lastSyncAt
    ? new Date(fitbitStatus.lastSyncAt).toLocaleString()
    : "Not synced yet";
  const isDarkMode = isThemeMounted ? theme === "dark" : false;
  const nextThemeLabel = isDarkMode ? "Light" : "Dark";

  return (
    <div className="min-h-screen bg-background pb-28">
      <Toaster />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-background/90 via-background/80 to-background/70 backdrop-blur-sm border-b border-border/60">
        <div className="flex h-16 items-center justify-between px-4 max-w-lg mx-auto">
          <h1 className="text-lg font-display text-foreground">Settings</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-[280px] w-full rounded-2xl" />
            <Skeleton className="h-[140px] w-full rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-6 animate-fade-up">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 font-display text-xl">
                  <div className="p-2 rounded-xl bg-secondary/10">
                    {isDarkMode ? (
                      <Moon className="h-5 w-5 text-secondary" />
                    ) : (
                      <Sun className="h-5 w-5 text-secondary" />
                    )}
                  </div>
                  Appearance
                </CardTitle>
                <CardDescription>
                  Toggle between light and dark mode
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isDarkMode ? "Dark mode" : "Light mode"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Choose the palette that feels best for you.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setTheme(isDarkMode ? "light" : "dark")}
                    disabled={!isThemeMounted}
                  >
                    Switch to {nextThemeLabel} mode
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 font-display text-xl">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Target className="h-5 w-5 text-primary-strong" />
                  </div>
                  Daily Goals
                </CardTitle>
                <CardDescription>
                  Set your daily calorie and step targets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="calorieGoal" className="text-sm font-medium">
                    Daily Calorie Goal (kcal)
                  </Label>
                  <Input
                    id="calorieGoal"
                    type="number"
                    min="500"
                    max="10000"
                    placeholder="e.g., 2000"
                    value={calorieGoal}
                    onChange={(e) => setCalorieGoal(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stepGoal" className="text-sm font-medium">
                    Daily Step Goal
                  </Label>
                  <Input
                    id="stepGoal"
                    type="number"
                    min="1000"
                    max="100000"
                    placeholder="e.g., 10000"
                    value={stepGoal}
                    onChange={(e) => setStepGoal(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Goals"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 font-display text-xl">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Activity className="h-5 w-5 text-primary-strong" />
                  </div>
                  Fitbit
                </CardTitle>
                <CardDescription>
                  Sync your step count from Fitbit when you open the app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isFitbitLoading ? (
                  <Skeleton className="h-[88px] w-full rounded-xl" />
                ) : fitbitStatus?.connected ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/60 p-4 bg-muted/40">
                      <p className="text-sm font-medium text-foreground">
                        Connected
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last sync: {fitbitLastSync}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleDisconnectFitbit}
                      disabled={isFitbitDisconnecting}
                    >
                      {isFitbitDisconnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        "Disconnect Fitbit"
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" onClick={handleConnectFitbit}>
                    Connect Fitbit
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 font-display text-xl">
                  <div className="p-2 rounded-xl bg-accent">
                    <User className="h-5 w-5 text-accent-foreground" />
                  </div>
                  Account
                </CardTitle>
                <CardDescription>
                  Manage your account settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40">
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "h-12 w-12",
                      },
                    }}
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Click your avatar to manage your account, change your profile, or sign out.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
