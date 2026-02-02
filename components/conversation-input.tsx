"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Send,
  Square,
  ChevronDown,
  Sparkles,
  UtensilsCrossed,
  Dumbbell,
  Footprints,
  Scale,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { MealInterpretationDialog } from "@/components/meal-interpretation-dialog";
import { WorkoutSetInterpretationDialog } from "@/components/workout-set-interpretation-dialog";
import { MetricInterpretationDialog } from "@/components/metric-interpretation-dialog";
import { cn } from "@/lib/utils";
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
  onOpenChat: (draft?: string) => void;
}

type Suggestion =
  | { label: string; icon: LucideIcon; action: "autofill"; value: string }
  | { label: string; icon: LucideIcon; action: "navigate"; href: string };

const suggestions: Suggestion[] = [
  { label: "Meal", icon: UtensilsCrossed, action: "autofill", value: "Had " },
  { label: "Workout", icon: Dumbbell, action: "navigate", href: "/workouts/new" },
  { label: "Steps", icon: Footprints, action: "autofill", value: "Steps today: " },
  { label: "Weight", icon: Scale, action: "autofill", value: "Weight today: " },
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
  onOpenChat,
}: ConversationInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [state, setState] = useState<RecordingState>("idle");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentSource, setCurrentSource] = useState<ConversationSource>("text");
  const [inputSource, setInputSource] = useState<ConversationSource>("text");
  const [mealInterpretation, setMealInterpretation] = useState<MealInterpretation | null>(null);
  const [workoutInterpretation, setWorkoutInterpretation] =
    useState<WorkoutSetInterpretation | null>(null);
  const [metricInterpretation, setMetricInterpretation] =
    useState<MetricInterpretation | null>(null);
  const [metricType, setMetricType] = useState<"weight" | "steps" | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const processingRef = useRef(false);
  const router = useRouter();

  const {
    isRecording,
    isPreparing,
    audioBlob,
    duration,
    error: recorderError,
    mimeType,
    startRecording,
    stopRecording,
    cancelRecording,
    reset: resetRecorder,
  } = useVoiceRecorder();

  const placeholder = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "Had oatmeal and coffee for breakfast...";
    if (hour < 17) return "Lunch was a chicken salad...";
    if (hour < 22) return "Dinner: salmon, rice, and veggies...";
    return "Steps 8,500 or Weight 72 kg...";
  }, []);

  const resetAll = useCallback(() => {
    setState("idle");
    setCurrentTranscript("");
    setInputValue("");
    setInputSource("text");
    setMealInterpretation(null);
    setWorkoutInterpretation(null);
    setMetricInterpretation(null);
    setMetricType(null);
    resetRecorder();
  }, [resetRecorder]);

  const handleOpenChat = useCallback(
    (draft?: string) => {
      onOpenChat(draft);
      setIsExpanded(false);
    },
    [onOpenChat]
  );

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

  useEffect(() => {
    if (recorderError) {
      toast.error(recorderError);
      setState("idle");
      processingRef.current = false;
    }
  }, [recorderError]);

  // Auto-expand when recording or has input
  useEffect(() => {
    if (isRecording || inputValue.trim()) {
      setIsExpanded(true);
    }
  }, [isRecording, inputValue]);

  // Focus textarea when expanded
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isExpanded]);

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

        const transcript = data.data.transcript;
        setIsExpanded(true);
        resetRecorder();
        // Auto-submit the transcription to the interpreter
        await handleTranscriptSubmit(transcript, "voice");
      } catch (error) {
        console.error("Transcription error:", error);
        toast.error("Failed to transcribe audio. Please try again.");
        setState("idle");
        resetRecorder();
      } finally {
        processingRef.current = false;
      }
    },
    [handleTranscriptSubmit, mimeType, resetRecorder]
  );

  useEffect(() => {
    if (audioBlob && !processingRef.current) {
      handleRecordingComplete(audioBlob);
    }
  }, [audioBlob, handleRecordingComplete]);

  const handleTextSubmit = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setInputValue("");
    await handleTranscriptSubmit(trimmed, inputSource);
  }, [handleTranscriptSubmit, inputSource, inputValue]);

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
          (metricType === "steps" ? `Steps ${value}` : `Weight ${value} kg`),
        systemText:
          metricType === "steps"
            ? `Saved ${value.toLocaleString()} steps`
            : `Saved weight ${value} kg`,
        source: currentSource,
        referenceType: "daily_metric",
        referenceId: null,
        metadata:
          metricType === "steps"
            ? { steps: value, date: today }
            : { weightKg: value, date: today },
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
    if (isPreparing) return "Preparing...";
    if (isRecording) {
      const mins = Math.floor(duration / 60);
      const secs = (duration % 60).toString().padStart(2, "0");
      return `Recording ${mins}:${secs}`;
    }
    if (state === "transcribing") return "Transcribing...";
    if (state === "interpreting") return "Analyzing...";
    if (state === "saving") return "Saving...";
    return null;
  }, [duration, isPreparing, isRecording, state]);

  const waveformBars = useMemo(() => {
    const total = 40;
    const mid = (total - 1) / 2;
    return Array.from({ length: total }, (_, index) => {
      const distance = Math.abs(index - mid);
      const height = 6 + Math.round((1 - distance / mid) * 12);
      return {
        height,
        delay: index * 0.07,
        duration: 1.05 + (index % 4) * 0.12,
      };
    });
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleTextSubmit();
    }
    if (event.key === "Escape") {
      setIsExpanded(false);
      textareaRef.current?.blur();
    }
  };

  const isBusy = state !== "idle" || isPreparing || isRecording;
  const isAnalyzing = state === "interpreting";
  const showRecordingWaveform = isRecording || isPreparing;
  const showTranscribing = state === "transcribing";
  const showWaveformPanel = showRecordingWaveform || showTranscribing;

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setIsExpanded(true);
      startRecording();
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.action === "navigate") {
      router.push(suggestion.href);
    } else {
      setInputValue(suggestion.value);
      setIsExpanded(true);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const length = suggestion.value.length;
          textareaRef.current.setSelectionRange(length, length);
        }
      }, 50);
    }
  };

  const handleRecordingAccept = () => {
    if (!isRecording) return;
    setState("transcribing");
    stopRecording();
  };

  const handleRecordingCancel = () => {
    processingRef.current = false;
    cancelRecording();
    resetAll();
    setIsExpanded(false);
  };

  return (
    <>
      {/* Main Command Center Container */}
      <div
        className={cn(
          "relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          // Glass morphism base
          "bg-card/95 backdrop-blur-2xl dark:bg-[#0d0d0f]/90",
          // Border with glow
          "border border-border/70 dark:border-white/[0.08]",
          // Shape
          isExpanded ? "rounded-[28px]" : "rounded-full",
          isExpanded
            ? "shadow-[0_-8px_28px_rgba(15,23,42,0.12)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.4)]"
            : "shadow-[0_-4px_18px_rgba(15,23,42,0.1)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
        )}
      >
        {/* Ambient glow effect behind mic button */}
        <div
          className={cn(
            "absolute transition-all duration-700",
            isExpanded
              ? "top-4 right-4 w-24 h-24 opacity-30"
              : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 opacity-20"
          )}
          style={{
            background: isRecording
              ? "radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(34,197,94,0.35) 0%, transparent 70%)",
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />

        {/* Collapsed State */}
        <div
          className={cn(
            "grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            isExpanded ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="flex items-center gap-3 p-2 pl-4">
              {/* Expand trigger / hint text */}
              <button
                onClick={() => setIsExpanded(true)}
                className="flex-1 flex items-center gap-3 text-left group"
              >
                <Sparkles className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors truncate">
                  Log a meal, workout, or ask a question...
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenChat()}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-border/60 bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
              >
                <Sparkles className="w-4 h-4" />
              </button>

              {/* Mic Button - Hero Element */}
              <div className="relative">
                {/* Pulse ring animation */}
                {!isRecording && !isBusy && (
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
                )}
                <button
                  onClick={handleMicClick}
                  disabled={isBusy && !isRecording}
                  className={cn(
                    "relative z-10 flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300",
                    isRecording
                      ? "bg-destructive text-white scale-110"
                      : "bg-primary text-primary-foreground hover:scale-105 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]",
                    isBusy && !isRecording && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isRecording ? (
                    <Square className="w-5 h-5 fill-current" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded State */}
        <div
          className={cn(
            "grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="p-4 space-y-4">
              {/* Header with collapse button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Command Center
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenChat(inputValue)}
                    className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
                  >
                    <Sparkles className="h-3 w-3" />
                    Ask Coach
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/60 hover:bg-muted transition-colors dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-muted/60 px-4 py-6 text-center dark:border-white/[0.08] dark:bg-white/[0.04]">
                  {/* Pulsing indicator dots */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                  </div>
                  {/* Transcribed text */}
                  {currentTranscript && (
                    <p className="text-sm text-muted-foreground/80 italic max-w-full px-2 line-clamp-2">
                      &ldquo;{currentTranscript}&rdquo;
                    </p>
                  )}
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                    Analyzing
                  </span>
                </div>
              ) : (
                <>
                  {/* Quick Suggestions */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.label}
                        onClick={() => handleSuggestionClick(suggestion)}
                        disabled={isBusy}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-full shrink-0",
                          "bg-muted/60 border border-border/60 dark:bg-white/[0.04] dark:border-white/[0.06]",
                          "text-sm text-muted-foreground",
                          "transition-all duration-200",
                          "hover:bg-muted hover:border-border/80 hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:border-white/[0.1]",
                          "hover:shadow-[0_0_12px_rgba(15,23,42,0.08)] dark:hover:shadow-[0_0_12px_rgba(255,255,255,0.05)]",
                          "active:scale-95",
                          isBusy && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <suggestion.icon className="w-4 h-4" />
                        <span>{suggestion.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Input Area */}
                  <div className="relative flex items-center">
                    {showWaveformPanel ? (
                      <div
                        className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]"
                      >
                        <div className="flex flex-1 min-w-0 items-center gap-3">
                          <div
                            className={cn(
                              "flex h-8 w-full flex-1 items-end justify-between overflow-hidden",
                              showTranscribing && "opacity-50 animate-pulse"
                            )}
                          >
                            {waveformBars.map((bar, index) => (
                              <span
                                key={`wave-${index}`}
                                className={cn(
                                  "voice-wave-bar w-0.5 rounded-full",
                                  showTranscribing
                                    ? "bg-primary/40 dark:bg-white/50"
                                    : "bg-primary/60 dark:bg-white/70"
                                )}
                                style={
                                  {
                                    height: `${bar.height}px`,
                                    animationDelay: `${bar.delay}s`,
                                    "--voice-wave-duration": `${bar.duration}s`,
                                  } as React.CSSProperties
                                }
                              />
                            ))}
                          </div>
                        </div>
                        {showRecordingWaveform && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleRecordingCancel}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:border-white/[0.08] dark:bg-white/[0.06]"
                              aria-label="Cancel recording"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleRecordingAccept}
                              disabled={!isRecording}
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-all duration-200 hover:scale-105",
                                !isRecording && "opacity-50 cursor-not-allowed"
                              )}
                              aria-label="Accept recording"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {!showRecordingWaveform && showTranscribing && (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80 dark:border-white/[0.08] dark:bg-white/[0.06]">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <textarea
                          ref={textareaRef}
                          value={inputValue}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            setInputValue(nextValue);
                            if (inputSource === "voice" && nextValue.trim() === "") {
                              setInputSource("text");
                            }
                          }}
                          onKeyDown={handleKeyDown}
                          placeholder={placeholder}
                          disabled={isBusy}
                          rows={2}
                          className={cn(
                            "w-full resize-none rounded-2xl px-4 py-3",
                            inputValue.trim() ? "pr-16" : "pr-28",
                            "bg-background border border-border/70 dark:bg-white/[0.04] dark:border-white/[0.08]",
                            "text-foreground placeholder:text-muted-foreground/60",
                            "focus:outline-none focus:border-primary/30 focus:bg-background",
                            "focus:shadow-[0_0_0_3px_rgba(22,163,74,0.12)] dark:focus:shadow-[0_0_0_3px_rgba(34,197,94,0.1)]",
                            "transition-all duration-200",
                            isBusy && "opacity-50 cursor-not-allowed"
                          )}
                        />

                        {/* Action Buttons - centered vertically */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {/* Mic Button - hidden when user is typing */}
                          {!inputValue.trim() && (
                            <button
                              onClick={handleMicClick}
                              disabled={isBusy && !isRecording}
                              className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                                isRecording
                                  ? "bg-destructive text-white animate-pulse"
                                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground dark:bg-white/[0.06] dark:hover:bg-white/[0.1]",
                                isBusy && !isRecording && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {isRecording ? (
                                <Square className="w-4 h-4 fill-current" />
                              ) : (
                                <Mic className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Send Button */}
                          <button
                            onClick={handleTextSubmit}
                            disabled={isBusy || !inputValue.trim()}
                            className={cn(
                              "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                              inputValue.trim()
                                ? "bg-primary text-primary-foreground hover:shadow-[0_0_16px_rgba(22,163,74,0.25)]"
                                : "bg-muted/60 text-muted-foreground dark:bg-white/[0.06]",
                              (isBusy || !inputValue.trim()) && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status Text */}
                  {statusText && !showWaveformPanel && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span>{statusText}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
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
    </>
  );
}
