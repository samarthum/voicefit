"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { TranscriptEditorDialog } from "@/components/transcript-editor-dialog";
import { MealInterpretationDialog } from "@/components/meal-interpretation-dialog";
import { WorkoutSetInterpretationDialog } from "@/components/workout-set-interpretation-dialog";
import { MetricInterpretationDialog } from "@/components/metric-interpretation-dialog";
import type {
  ConversationSource,
  InterpretEntryResponse,
  MealInterpretation,
  MetricInterpretation,
  RecordingState,
  WorkoutSetInterpretation,
} from "@/lib/types";
import type { ConversationFeedEvent } from "@/components/conversation-item";

interface ConversationInputProps {
  onEventOptimistic: (event: ConversationFeedEvent) => void;
  onEventResolved: (eventId: string) => void;
  onEventFailed: (eventId: string, error: string) => void;
  onRefresh: () => Promise<void>;
}

const suggestions = [
  { label: "Log breakfast", value: "Breakfast: " },
  { label: "Log workout set", value: "Did 3 sets of squats, 8 reps at 60 kg" },
  { label: "Log steps", value: "Steps 8500" },
  { label: "Log weight", value: "Weight 72 kg" },
  { label: "Ask question", value: "How many calories today?" },
];

const buildWorkoutSystemText = (setData: {
  exerciseName: string;
  exerciseType: "resistance" | "cardio";
  reps: number | null;
  weightKg: number | null;
  durationMinutes: number | null;
}) => {
  const details: string[] = [];
  if (setData.exerciseType === "cardio") {
    if (setData.durationMinutes !== null && setData.durationMinutes !== undefined) {
      details.push(`${setData.durationMinutes} min`);
    }
  } else {
    if (setData.reps !== null && setData.reps !== undefined) {
      details.push(`${setData.reps} reps`);
    }
    if (setData.weightKg !== null && setData.weightKg !== undefined) {
      details.push(`${setData.weightKg} kg`);
    }
  }
  return `Logged ${setData.exerciseName}${
    details.length ? ` · ${details.join(" · ")}` : ""
  }`;
};

const getFileExtension = (type: string | null): string => {
  if (!type) return "webm";
  if (type.includes("mp4")) return "mp4";
  if (type.includes("webm")) return "webm";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  if (type.includes("mpeg")) return "mp3";
  return "webm";
};

export function ConversationInput({
  onEventOptimistic,
  onEventResolved,
  onEventFailed,
  onRefresh,
}: ConversationInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentSource, setCurrentSource] = useState<ConversationSource>("text");
  const [mealInterpretation, setMealInterpretation] = useState<MealInterpretation | null>(null);
  const [workoutInterpretation, setWorkoutInterpretation] =
    useState<WorkoutSetInterpretation | null>(null);
  const [metricInterpretation, setMetricInterpretation] =
    useState<MetricInterpretation | null>(null);
  const [metricType, setMetricType] = useState<"weight" | "steps" | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const processingRef = useRef(false);

  const {
    isRecording,
    isPreparing,
    audioBlob,
    duration,
    error: recorderError,
    mimeType,
    startRecording,
    stopRecording,
    reset: resetRecorder,
  } = useVoiceRecorder();

  const placeholder = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "e.g., Had oatmeal and coffee for breakfast";
    if (hour < 17) return "e.g., Lunch was a chicken salad and iced tea";
    if (hour < 22) return "e.g., Dinner: salmon, rice, and veggies";
    return "e.g., Steps 8,500 or Weight 72 kg";
  }, []);

  const resetAll = useCallback(() => {
    setState("idle");
    setTranscript("");
    setCurrentTranscript("");
      setInputValue("");
    setMealInterpretation(null);
    setWorkoutInterpretation(null);
    setMetricInterpretation(null);
    setMetricType(null);
    resetRecorder();
  }, [resetRecorder]);

  const addOptimisticEvent = useCallback(
    (event: Omit<ConversationFeedEvent, "id" | "createdAt">) => {
      const localId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const createdAt = new Date().toISOString();
      onEventOptimistic({
        ...event,
        id: localId,
        createdAt,
        status: "pending",
      });
      return localId;
    },
    [onEventOptimistic]
  );

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setState("transcribing");

      try {
        const formData = new FormData();
        const extension = getFileExtension(mimeType);
        formData.append("audio", blob, `recording.${extension}`);

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to transcribe");
        }

        setTranscript(data.data.transcript);
        setState("editing");
      } catch (error) {
        console.error("Transcription error:", error);
        toast.error("Failed to transcribe audio. Please try again.");
        setState("idle");
        resetRecorder();
      } finally {
        processingRef.current = false;
      }
    },
    [mimeType, resetRecorder]
  );

  useEffect(() => {
    if (audioBlob && state === "idle" && !processingRef.current) {
      handleRecordingComplete(audioBlob);
    }
  }, [audioBlob, handleRecordingComplete, state]);

  useEffect(() => {
    if (recorderError) {
      toast.error(recorderError);
    }
  }, [recorderError]);

  const handleQuestionSave = useCallback(
    async (answer: string, text: string, source: ConversationSource) => {
      const pendingId = addOptimisticEvent({
        kind: "question",
        userText: text,
        systemText: answer,
        source,
        referenceType: null,
        referenceId: null,
        metadata: { answer },
      });

      setState("saving");
      try {
        const response = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "question",
            userText: text,
            systemText: answer,
            source,
            referenceType: null,
            referenceId: null,
            metadata: { answer },
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to save question");
        }

        onEventResolved(pendingId);
        await onRefresh();
        resetAll();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save question";
        onEventFailed(pendingId, message);
        toast.error(message);
        setState("idle");
      }
    },
    [addOptimisticEvent, onEventFailed, onEventResolved, onRefresh, resetAll]
  );

  const handleTranscriptSubmit = useCallback(
    async (text: string, source: ConversationSource) => {
      setCurrentTranscript(text);
      setCurrentSource(source);
      setState("interpreting");

      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await fetch("/api/interpret/entry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text, source, timezone }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to interpret entry");
        }

        const result = data.data as InterpretEntryResponse;

        switch (result.intent) {
          case "meal":
            setMealInterpretation(result.payload);
            setState("reviewing");
            break;
          case "workout_set":
            setWorkoutInterpretation(result.payload);
            setState("reviewing");
            break;
          case "weight":
          case "steps":
            setMetricType(result.intent);
            setMetricInterpretation(result.payload);
            setState("reviewing");
            break;
          case "question":
            await handleQuestionSave(result.payload.answer, text, source);
            break;
          default:
            throw new Error("Unsupported entry type");
        }
      } catch (error) {
        console.error("Interpretation error:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to interpret entry"
        );
        setState("idle");
      }
    },
    [handleQuestionSave]
  );

  const handleTextSubmit = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setInputValue("");
    await handleTranscriptSubmit(trimmed, "text");
  }, [handleTranscriptSubmit, inputValue]);

  const handleMealSave = useCallback(
    async (mealData: { mealType: string; description: string; calories: number }) => {
      const pendingId = addOptimisticEvent({
        kind: "meal",
        userText: currentTranscript || mealData.description,
        systemText: `Logged ${mealData.description} · ${mealData.calories} kcal`,
        source: currentSource,
        referenceType: "meal",
        referenceId: null,
        metadata: {
          mealType: mealData.mealType,
          description: mealData.description,
          calories: mealData.calories,
        },
      });

      setState("saving");
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...mealData,
          eatenAt: new Date().toISOString(),
            transcriptRaw: currentTranscript,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to save meal");
      }

        toast.success("Meal logged successfully!");
        onEventResolved(pendingId);
        await onRefresh();
        resetAll();
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save meal";
        onEventFailed(pendingId, message);
        toast.error(message);
        setState("reviewing");
      }
    },
    [
      addOptimisticEvent,
      currentSource,
      currentTranscript,
      onEventFailed,
      onEventResolved,
      onRefresh,
      resetAll,
    ]
  );

  const ensureQuickSession = useCallback(async () => {
    const today = new Date().toLocaleDateString("en-CA");
    const response = await fetch(`/api/workout-sessions?date=${today}&limit=5`);
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to load workout sessions");
    }

    const sessions = result.data.sessions as { id: string; endedAt: string | null }[];
    const activeSession = sessions.find((session) => !session.endedAt);
    if (activeSession) {
      return activeSession.id;
    }

    const createResponse = await fetch("/api/workout-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Quick Log" }),
    });
    const createResult = await createResponse.json();
    if (!createResult.success) {
      throw new Error(createResult.error || "Failed to create workout session");
    }
    return createResult.data.id as string;
  }, []);

  const handleWorkoutSave = useCallback(
    async (setData: {
    exerciseName: string;
    exerciseType: "resistance" | "cardio";
    reps: number | null;
    weightKg: number | null;
    durationMinutes: number | null;
    notes: string | null;
  }) => {
      setState("saving");
      let pendingId: string | null = null;
      try {
        const sessionId = await ensureQuickSession();
        pendingId = addOptimisticEvent({
        kind: "workout_set",
        userText: currentTranscript || `Logged ${setData.exerciseName}`,
        systemText: buildWorkoutSystemText(setData),
        source: currentSource,
        referenceType: "workout_set",
        referenceId: null,
          metadata: {
            ...setData,
            sessionId,
            performedAt: new Date().toISOString(),
          },
        });

      const response = await fetch("/api/workout-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sessionId,
          ...setData,
          performedAt: new Date().toISOString(),
            transcriptRaw: currentTranscript,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to save workout set");
      }

        toast.success("Workout set logged successfully!");
        if (pendingId) {
        onEventResolved(pendingId);
        }
        await onRefresh();
        resetAll();
    } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save workout set";
        if (pendingId) {
        onEventFailed(pendingId, message);
        }
        toast.error(message);
        setState("reviewing");
      }
    },
    [
      addOptimisticEvent,
      currentSource,
      currentTranscript,
      ensureQuickSession,
      onEventFailed,
      onEventResolved,
      onRefresh,
      resetAll,
    ]
  );

  const handleMetricSave = useCallback(
    async (value: number) => {
      if (!metricType) return;
      const today = new Date().toLocaleDateString("en-CA");
      const pendingId = addOptimisticEvent({
        kind: metricType,
        userText:
          currentTranscript ||
          (metricType === "steps"
            ? `Steps ${value}`
            : `Weight ${value} kg`),
        systemText:
          metricType === "steps"
            ? `Saved ${value.toLocaleString()} steps`
            : `Saved weight ${value} kg`,
        source: currentSource,
        referenceType: "daily_metric",
        referenceId: null,
        metadata:
          metricType === "steps" ? { steps: value, date: today } : { weightKg: value, date: today },
      });

      setState("saving");
    try {
      const payload =
          metricType === "steps"
            ? { date: today, steps: Math.round(value), transcriptRaw: currentTranscript }
            : { date: today, weightKg: value, transcriptRaw: currentTranscript };

      const response = await fetch("/api/daily-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to save metric");
      }

        toast.success(metricType === "steps" ? "Steps logged!" : "Weight logged!");
        onEventResolved(pendingId);
        await onRefresh();
        resetAll();
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save metric";
        onEventFailed(pendingId, message);
        toast.error(message);
        setState("reviewing");
      }
    },
    [
      addOptimisticEvent,
      currentSource,
      currentTranscript,
      metricType,
      onEventFailed,
      onEventResolved,
      onRefresh,
      resetAll,
    ]
  );

  const statusText = useMemo(() => {
    if (isPreparing) return "Preparing microphone...";
    if (isRecording)
      return `Recording ${Math.floor(duration / 60)}:${(duration % 60)
        .toString()
        .padStart(2, "0")}`;
    if (state === "transcribing") return "Transcribing...";
    if (state === "interpreting") return "Analyzing entry...";
    if (state === "saving") return "Saving entry...";
    return 'Tip: Ask questions like "How many calories today?"';
  }, [duration, isPreparing, isRecording, state]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleTextSubmit();
    }
  };

  const isBusy = state !== "idle" || isPreparing || isRecording;

  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-md space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.label}
            variant="outline"
            size="sm"
            className="shrink-0 text-xs"
            onClick={() => {
              setInputValue(suggestion.value);
              textareaRef.current?.focus();
            }}
            disabled={isBusy}
          >
            {suggestion.label}
          </Button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={placeholder}
          className="min-h-[80px] resize-none"
          onKeyDown={handleKeyDown}
          disabled={isBusy}
            />
        <div className="flex flex-col gap-2">
          <Button
              type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isBusy && !isRecording}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={handleTextSubmit}
            disabled={isBusy || !inputValue.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{statusText}</p>

      <TranscriptEditorDialog
        open={state === "editing" || state === "transcribing"}
        onOpenChange={(open) => {
          if (!open) resetAll();
        }}
        transcript={transcript}
        isLoading={state === "transcribing"}
        onContinue={(text) => handleTranscriptSubmit(text, "voice")}
        onCancel={resetAll}
      />

      <MealInterpretationDialog
        key={
          mealInterpretation
            ? `${mealInterpretation.description}-${mealInterpretation.confidence}`
            : "meal-empty"
        }
        open={!!mealInterpretation && (state === "reviewing" || state === "saving")}
        onOpenChange={(open) => {
          if (!open) resetAll();
        }}
        interpretation={mealInterpretation}
        isLoading={state === "saving"}
        onSave={handleMealSave}
        onCancel={resetAll}
      />

      <WorkoutSetInterpretationDialog
        key={
          workoutInterpretation
            ? `${workoutInterpretation.exerciseName}-${workoutInterpretation.confidence}`
            : "workout-empty"
        }
        open={!!workoutInterpretation && (state === "reviewing" || state === "saving")}
        onOpenChange={(open) => {
          if (!open) resetAll();
        }}
        interpretation={workoutInterpretation}
        isLoading={state === "saving"}
        onSave={handleWorkoutSave}
        onCancel={resetAll}
      />

      <MetricInterpretationDialog
        open={
          !!metricInterpretation &&
          metricType !== null &&
          (state === "reviewing" || state === "saving")
        }
        metricType={metricType ?? "steps"}
        value={metricInterpretation?.value ?? null}
        confidence={metricInterpretation?.confidence}
        assumptions={metricInterpretation?.assumptions}
        isLoading={state === "saving"}
        onSave={handleMetricSave}
        onCancel={resetAll}
        onOpenChange={(open) => {
          if (!open) resetAll();
        }}
      />
    </div>
  );
}
