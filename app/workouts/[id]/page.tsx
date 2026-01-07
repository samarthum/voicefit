"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExerciseSetsGroup } from "@/components/exercise-sets-group";
import { VoiceWorkoutLogger } from "@/components/voice-workout-logger";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Square, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";

interface WorkoutSet {
  id: string;
  performedAt: string;
  exerciseName: string;
  reps: number;
  weightKg: number | null;
  notes: string | null;
}

interface WorkoutSession {
  id: string;
  title: string;
  startedAt: string;
  endedAt: string | null;
  sets: WorkoutSet[];
}

export default function WorkoutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [deleteSetId, setDeleteSetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/workout-sessions/${sessionId}`);
      const result = await response.json();

      if (result.success) {
        setSession(result.data);
      } else {
        toast.error("Failed to load workout");
      }
    } catch (error) {
      console.error("Session fetch error:", error);
      toast.error("Failed to load workout");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleEndWorkout = async () => {
    setIsEnding(true);
    try {
      const response = await fetch(`/api/workout-sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endedAt: new Date().toISOString() }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Workout ended!");
        setSession((prev) => prev ? { ...prev, endedAt: result.data.endedAt } : prev);
      } else {
        toast.error("Failed to end workout");
      }
    } catch (error) {
      console.error("End workout error:", error);
      toast.error("Failed to end workout");
    } finally {
      setIsEnding(false);
    }
  };

  const handleDeleteSet = async () => {
    if (!deleteSetId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/workout-sets/${deleteSetId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        toast.success("Set deleted");
        setSession((prev) =>
          prev
            ? { ...prev, sets: prev.sets.filter((s) => s.id !== deleteSetId) }
            : prev
        );
      } else {
        toast.error("Failed to delete set");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete set");
    } finally {
      setIsDeleting(false);
      setDeleteSetId(null);
    }
  };

  const isActive = session && !session.endedAt;

  // Group sets by exercise name
  const groupedSets = useMemo(() => {
    if (!session) return [];

    const groups: { exerciseName: string; sets: WorkoutSet[] }[] = [];
    const exerciseOrder: string[] = [];

    session.sets.forEach((set) => {
      if (!exerciseOrder.includes(set.exerciseName)) {
        exerciseOrder.push(set.exerciseName);
        groups.push({ exerciseName: set.exerciseName, sets: [] });
      }
      const group = groups.find((g) => g.exerciseName === set.exerciseName);
      if (group) {
        group.sets.push(set);
      }
    });

    return groups;
  }, [session]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Toaster />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/workouts")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold truncate">
              {session?.title || "Workout"}
            </h1>
            {isActive && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                Active
              </Badge>
            )}
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[200px] w-full" />
          </>
        ) : session ? (
          <>
            {/* Voice Logger (only if session is active) */}
            {isActive && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add Set</CardTitle>
                </CardHeader>
                <CardContent>
                  <VoiceWorkoutLogger
                    sessionId={sessionId}
                    onSetSaved={fetchSession}
                  />
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Hold the button and describe your set
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Exercises and Sets */}
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                {groupedSets.length} Exercise{groupedSets.length !== 1 ? "s" : ""} · {session.sets.length} Set{session.sets.length !== 1 ? "s" : ""}
              </h2>

              {session.sets.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-sm text-muted-foreground text-center">
                      No sets logged yet. Hold the mic button to add a set.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {groupedSets.map((group) => (
                    <ExerciseSetsGroup
                      key={group.exerciseName}
                      exerciseName={group.exerciseName}
                      sets={group.sets}
                      onDeleteSet={isActive ? (id) => setDeleteSetId(id) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* End Workout Button */}
            {isActive && (
              <Button
                variant="destructive"
                className="w-full"
                size="lg"
                onClick={handleEndWorkout}
                disabled={isEnding}
              >
                {isEnding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ending...
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    End Workout
                  </>
                )}
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Workout not found.</p>
          </div>
        )}
      </main>

      <DeleteConfirmDialog
        open={!!deleteSetId}
        onOpenChange={(open) => !open && setDeleteSetId(null)}
        title="Delete Set"
        description="Are you sure you want to delete this set?"
        onConfirm={handleDeleteSet}
        onCancel={() => setDeleteSetId(null)}
        isLoading={isDeleting}
      />

      <BottomNav />
    </div>
  );
}
