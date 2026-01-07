"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { MicRecordButton } from "@/components/mic-record-button";
import { TranscriptEditorDialog } from "@/components/transcript-editor-dialog";
import { WorkoutSetInterpretationDialog } from "@/components/workout-set-interpretation-dialog";
import type { WorkoutSetInterpretation, RecordingState } from "@/lib/types";
import { toast } from "sonner";

interface VoiceWorkoutLoggerProps {
  sessionId: string;
  onSetSaved: () => void;
}

export function VoiceWorkoutLogger({ sessionId, onSetSaved }: VoiceWorkoutLoggerProps) {
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
  const [interpretation, setInterpretation] = useState<WorkoutSetInterpretation | null>(null);
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
      const response = await fetch("/api/interpret/workout-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: editedTranscript }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to interpret workout set");
      }

      setInterpretation(data.data);
      setState("reviewing");
    } catch (error) {
      console.error("Interpretation error:", error);
      toast.error("Failed to analyze set. Please try again.");
      setState("editing");
    }
  };

  // Handle set save
  const handleSetSave = async (setData: {
    exerciseName: string;
    reps: number;
    weightKg: number | null;
    notes: string | null;
  }) => {
    setState("saving");

    try {
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

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to save set");
      }

      toast.success("Set logged successfully!");
      resetAll();
      onSetSaved();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save set. Please try again.");
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

      <WorkoutSetInterpretationDialog
        open={state === "reviewing" || state === "interpreting" || state === "saving"}
        onOpenChange={(open) => {
          if (!open) resetAll();
        }}
        interpretation={interpretation}
        isLoading={state === "interpreting" || state === "saving"}
        onSave={handleSetSave}
        onCancel={resetAll}
      />
    </div>
  );
}
