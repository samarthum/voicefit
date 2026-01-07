"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NewWorkoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Immediately create a workout and redirect
    const createWorkout = async () => {
      try {
        // Auto-generate title based on date
        const now = new Date();
        const title = now.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });

        const response = await fetch("/api/workout-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: `Workout · ${title}` }),
        });

        const result = await response.json();

        if (result.success) {
          router.replace(`/workouts/${result.data.id}`);
        } else {
          setError(result.error || "Failed to start workout");
          toast.error(result.error || "Failed to start workout");
        }
      } catch (err) {
        console.error("Create workout error:", err);
        setError("Failed to start workout");
        toast.error("Failed to start workout");
      }
    };

    createWorkout();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => router.push("/workouts")}
            className="text-primary underline"
          >
            Go back to workouts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Starting workout...</p>
      </div>
    </div>
  );
}
