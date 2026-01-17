"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutSessionCard } from "@/components/workout-session-card";
import { BottomNav } from "@/components/bottom-nav";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Plus, Dumbbell } from "lucide-react";
import { toast, Toaster } from "sonner";

interface WorkoutSession {
  id: string;
  title: string;
  startedAt: string;
  endedAt: string | null;
  setCount: number;
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/workout-sessions?limit=50");
      const result = await response.json();

      if (result.success) {
        setSessions(result.data.sessions);
      } else {
        toast.error("Failed to load workouts");
      }
    } catch (error) {
      console.error("Sessions fetch error:", error);
      toast.error("Failed to load workouts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/workout-sessions/${deleteId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        toast.success("Workout deleted");
        setSessions((prev) => prev.filter((s) => s.id !== deleteId));
      } else {
        toast.error("Failed to delete workout");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete workout");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <Toaster />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-background/90 via-background/80 to-background/70 backdrop-blur-sm border-b border-border/60">
        <div className="flex h-16 items-center justify-between px-4 max-w-lg mx-auto">
          <h1 className="text-lg font-display text-foreground">Workout Logs</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Start Workout Button */}
        <div className="animate-fade-up">
          <Button
            variant="outline"
            className="w-full border-border/60 bg-card/70 text-foreground hover:bg-card"
            size="lg"
            onClick={() => router.push("/workouts/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Start Workout
          </Button>
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Dumbbell className="w-8 h-8 text-secondary-foreground" />
            </div>
            <p className="text-foreground font-medium">No workouts logged yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tap the button above to start your first workout
            </p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {sessions.map((session) => (
              <WorkoutSessionCard
                key={session.id}
                id={session.id}
                title={session.title}
                startedAt={session.startedAt}
                endedAt={session.endedAt}
                setCount={session.setCount}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        )}
      </main>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Workout"
        description="Are you sure you want to delete this workout and all its sets? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />

      <BottomNav />
    </div>
  );
}
