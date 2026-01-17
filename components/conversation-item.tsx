"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ConversationEvent, ConversationEventKind } from "@/lib/types";

export type ConversationFeedEvent = ConversationEvent & {
  status?: "pending" | "failed";
  error?: string;
};

const kindStyles: Record<ConversationEventKind, string> = {
  meal: "bg-primary/10 text-primary border-primary/20",
  workout_set: "bg-secondary/10 text-secondary border-secondary/20",
  weight: "bg-accent/10 text-accent border-accent/20",
  steps: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  question: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  system: "bg-muted text-muted-foreground border-muted",
};

const kindLabels: Record<ConversationEventKind, string> = {
  meal: "Meal",
  workout_set: "Workout",
  weight: "Weight",
  steps: "Steps",
  question: "Question",
  system: "System",
};

function formatTimestamp(createdAt: string) {
  const date = new Date(createdAt);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) return time;
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${day} · ${time}`;
}

type WorkoutSessionSet = {
  id?: string;
  exerciseName: string;
  exerciseType?: string;
  reps?: number | null;
  weightKg?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
  performedAt?: string;
};

const getMetadataObject = (metadata: ConversationFeedEvent["metadata"]) => {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
};

const parseSessionSets = (metadata: Record<string, unknown>): WorkoutSessionSet[] => {
  if (!Array.isArray(metadata.sessionSets)) return [];

  return metadata.sessionSets.flatMap((set): WorkoutSessionSet[] => {
    if (!set || typeof set !== "object" || Array.isArray(set)) return [];
    const record = set as Record<string, unknown>;
    const exerciseName =
      typeof record.exerciseName === "string" ? record.exerciseName : null;
    if (!exerciseName) return [];

    return [
      {
        id: typeof record.id === "string" ? record.id : undefined,
        exerciseName,
        exerciseType: typeof record.exerciseType === "string" ? record.exerciseType : undefined,
        reps: typeof record.reps === "number" ? record.reps : null,
        weightKg: typeof record.weightKg === "number" ? record.weightKg : null,
        durationMinutes:
          typeof record.durationMinutes === "number" ? record.durationMinutes : null,
        notes: typeof record.notes === "string" ? record.notes : null,
        performedAt: typeof record.performedAt === "string" ? record.performedAt : undefined,
      },
    ];
  });
};

const formatSetTime = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildSetDetails = (set: WorkoutSessionSet) => {
  const parts: string[] = [];
  if (set.exerciseType === "cardio") {
    if (set.durationMinutes !== null && set.durationMinutes !== undefined) {
      parts.push(`${set.durationMinutes} min`);
    }
  } else {
    if (set.reps !== null && set.reps !== undefined) {
      parts.push(`${set.reps} reps`);
    }
    if (set.weightKg !== null && set.weightKg !== undefined) {
      parts.push(`${set.weightKg} kg`);
    }
  }
  if (set.notes) {
    parts.push(set.notes);
  }
  return parts.join(" · ");
};

export function ConversationItem({ event }: { event: ConversationFeedEvent }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const metadata = getMetadataObject(event.metadata);
  const sessionSets = parseSessionSets(metadata);
  const isWorkoutSessionSummary =
    event.kind === "workout_set" && sessionSets.length > 0 && metadata.sessionId;
  const exerciseCount = isWorkoutSessionSummary
    ? new Set(sessionSets.map((set) => set.exerciseName.toLowerCase().trim())).size
    : 0;
  const statusLabel =
    event.status === "pending"
      ? "Saving..."
      : event.status === "failed"
      ? "Failed"
      : null;

  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className={cn("border", kindStyles[event.kind])}
          >
            {isWorkoutSessionSummary ? "Workout session" : kindLabels[event.kind]}
          </Badge>
          <span>{formatTimestamp(event.createdAt)}</span>
          {event.source === "voice" && (
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
              voice
            </span>
          )}
          {event.source === "text" && (
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
              text
            </span>
          )}
          {statusLabel && (
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 text-xs font-medium",
                event.status === "failed" ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {event.status === "pending" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {statusLabel}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {isWorkoutSessionSummary ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="w-full rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Workout session</p>
                    <p className="text-xs text-muted-foreground">
                      {sessionSets.length} set{sessionSets.length === 1 ? "" : "s"} ·{" "}
                      {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </div>
              </button>
              {isExpanded && (
                <div className="space-y-2 rounded-xl border border-border/40 bg-background/40 px-3 py-2">
                  {sessionSets.map((set) => {
                    const timeLabel = formatSetTime(set.performedAt);
                    const details = buildSetDetails(set);
                    const meta = [timeLabel, details].filter(Boolean).join(" · ");
                    return (
                      <div key={set.id ?? `${set.exerciseName}-${set.performedAt}`}>
                        <p className="text-sm text-foreground">{set.exerciseName}</p>
                        {meta && (
                          <p className="text-xs text-muted-foreground">{meta}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">You</p>
            <p className="text-sm leading-relaxed text-foreground">{event.userText}</p>
          </div>
          {event.systemText && (
            <div className="rounded-xl border border-border/50 bg-muted/40 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Assistant
                  </p>
              <p className="text-sm leading-relaxed text-foreground">{event.systemText}</p>
            </div>
              )}
            </>
          )}
          {event.status === "failed" && event.error && (
            <p className="text-xs text-destructive">{event.error}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
