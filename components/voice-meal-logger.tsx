"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { MicRecordButton } from "@/components/mic-record-button";
import { TranscriptEditorDialog } from "@/components/transcript-editor-dialog";
import { TextInputDialog } from "@/components/text-input-dialog";
import { MealInterpretationDialog } from "@/components/meal-interpretation-dialog";
import type { MealInterpretation, RecordingState } from "@/lib/types";
import { toast } from "sonner";

interface VoiceMealLoggerProps {
  onMealSaved: () => void;
  selectedDate?: string; // Format: "YYYY-MM-DD" (e.g., "2026-01-28")
}

// Helper to build a datetime by combining a date string with current time
function buildDateTimeForSelectedDate(selectedDate?: string): string {
  const now = new Date();
  if (!selectedDate) {
    return now.toISOString();
  }
  // Combine the selected date with the current time of day
  const [year, month, day] = selectedDate.split("-").map(Number);
  const combined = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
  return combined.toISOString();
}

export function VoiceMealLogger({ onMealSaved, selectedDate }: VoiceMealLoggerProps) {
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

  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interpretation, setInterpretation] = useState<MealInterpretation | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const processingRef = useRef(false);

  // Helper function to get file extension from MIME type
  const getFileExtension = (mimeType: string | null): string => {
    if (!mimeType) return "webm";
    if (mimeType.includes("mp4")) return "mp4";
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("wav")) return "wav";
    if (mimeType.includes("mpeg")) return "mp3";
    return "webm"; // default fallback
  };

  // Handle recording completion
  const handleRecordingComplete = useCallback(async (blob: Blob) => {
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
  }, [mimeType, resetRecorder]);

  // Effect to handle audio blob changes
  useEffect(() => {
    if (audioBlob && state === "idle" && !processingRef.current) {
      handleRecordingComplete(audioBlob);
    }
  }, [audioBlob, state, handleRecordingComplete]);

  // Handle transcript editing
  const handleTranscriptContinue = async (editedTranscript: string) => {
    setCurrentTranscript(editedTranscript);
    setState("interpreting");

    try {
      const eatenAt = buildDateTimeForSelectedDate(selectedDate);
      const response = await fetch("/api/interpret/meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: editedTranscript, eatenAt }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to interpret meal");
      }

      setInterpretation(data.data);
      setState("reviewing");
    } catch (error) {
      console.error("Interpretation error:", error);
      toast.error("Failed to analyze meal. Please try again.");
      setState("editing");
    }
  };

  // Handle text input submission (skip transcription, go directly to interpretation)
  const handleTextInputSubmit = async (text: string) => {
    setShowTextInput(false);
    setCurrentTranscript(text);
    setState("interpreting");

    try {
      const eatenAt = buildDateTimeForSelectedDate(selectedDate);
      const response = await fetch("/api/interpret/meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, eatenAt }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to interpret meal");
      }

      setInterpretation(data.data);
      setState("reviewing");
    } catch (error) {
      console.error("Interpretation error:", error);
      toast.error("Failed to analyze meal. Please try again.");
      setState("idle");
    }
  };

  // Handle meal save
  const handleMealSave = async (mealData: {
    mealType: string;
    description: string;
    calories: number;
  }) => {
    setState("saving");

    try {
      const eatenAt = buildDateTimeForSelectedDate(selectedDate);
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...mealData,
          eatenAt,
          transcriptRaw: currentTranscript,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to save meal");
      }

      toast.success("Meal logged successfully!");
      resetAll();
      onMealSaved();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save meal. Please try again.");
      setState("reviewing");
    }
  };

  // Reset all state
  const resetAll = () => {
    setState("idle");
    setTranscript("");
    setInterpretation(null);
    setCurrentTranscript("");
    setShowTextInput(false);
    resetRecorder();
  };

  // Show recorder error
  if (recorderError) {
    toast.error(recorderError);
  }

  return (
    <div className="flex flex-col items-center">
      <MicRecordButton
        isRecording={isRecording}
        isPreparing={isPreparing}
        duration={duration}
        onStart={startRecording}
        onStop={stopRecording}
        disabled={state !== "idle" || isPreparing}
        hideStatus
      />

      {/* Status / text input alternative */}
      <div className="mt-4 text-sm text-muted-foreground">
        {isPreparing ? (
          <span>Preparing...</span>
        ) : isRecording ? (
          <span className="text-destructive font-medium tabular-nums">
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
          </span>
        ) : (
          <button
            onClick={() => setShowTextInput(true)}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors text-xs"
          >
            type instead
          </button>
        )}
      </div>

      <TextInputDialog
        open={showTextInput}
        onOpenChange={setShowTextInput}
        onSubmit={handleTextInputSubmit}
        onCancel={() => setShowTextInput(false)}
        title="Log Meal"
        description="Describe what you ate in natural language."
        placeholder="e.g., I had a chicken sandwich and a coffee for lunch"
        submitLabel="Continue"
        isLoading={state === "interpreting"}
      />

      <TranscriptEditorDialog
        open={state === "editing" || state === "transcribing"}
        onOpenChange={(open) => {
          if (!open) resetAll();
        }}
        transcript={transcript}
        isLoading={state === "transcribing"}
        onContinue={handleTranscriptContinue}
        onCancel={resetAll}
      />

      <MealInterpretationDialog
        key={interpretation ? `${interpretation.description}-${interpretation.confidence}` : 'empty'}
        open={state === "reviewing" || state === "interpreting" || state === "saving"}
        onOpenChange={(open) => {
          if (!open) resetAll();
        }}
        interpretation={interpretation}
        isLoading={state === "interpreting" || state === "saving"}
        onSave={handleMealSave}
        onCancel={resetAll}
        selectedDate={selectedDate}
      />
    </div>
  );
}
