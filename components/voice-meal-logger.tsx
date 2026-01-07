"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { MicRecordButton } from "@/components/mic-record-button";
import { TranscriptEditorDialog } from "@/components/transcript-editor-dialog";
import { MealInterpretationDialog } from "@/components/meal-interpretation-dialog";
import type { MealInterpretation, RecordingState } from "@/lib/types";
import { toast } from "sonner";

interface VoiceMealLoggerProps {
  onMealSaved: () => void;
}

export function VoiceMealLogger({ onMealSaved }: VoiceMealLoggerProps) {
  const {
    isRecording,
    isPreparing,
    audioBlob,
    duration,
    error: recorderError,
    startRecording,
    stopRecording,
    reset: resetRecorder,
  } = useVoiceRecorder();

  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interpretation, setInterpretation] = useState<MealInterpretation | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const processingRef = useRef(false);

  // Handle recording completion
  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setState("transcribing");

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

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
  }, [resetRecorder]);

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
      const response = await fetch("/api/interpret/meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: editedTranscript }),
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

  // Handle meal save
  const handleMealSave = async (mealData: {
    mealType: string;
    description: string;
    calories: number;
  }) => {
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
        open={state === "reviewing" || state === "interpreting" || state === "saving"}
        onOpenChange={(open) => {
          if (!open) resetAll();
        }}
        interpretation={interpretation}
        isLoading={state === "interpreting" || state === "saving"}
        onSave={handleMealSave}
        onCancel={resetAll}
      />
    </div>
  );
}
