"use client";

import { useCallback, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MicRecordButtonProps {
  isRecording: boolean;
  isPreparing: boolean;
  duration: number;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  className?: string;
}

export function MicRecordButton({
  isRecording,
  isPreparing,
  duration,
  onStart,
  onStop,
  disabled = false,
  className,
}: MicRecordButtonProps) {
  const isHoldingRef = useRef(false);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || isPreparing) return;
      e.preventDefault();
      isHoldingRef.current = true;
      onStart();
    },
    [disabled, isPreparing, onStart]
  );

  const handlePointerUp = useCallback(() => {
    if (isHoldingRef.current && isRecording) {
      isHoldingRef.current = false;
      onStop();
    }
  }, [isRecording, onStop]);

  const handlePointerLeave = useCallback(() => {
    if (isHoldingRef.current && isRecording) {
      isHoldingRef.current = false;
      onStop();
    }
  }, [isRecording, onStop]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Button
        variant={isRecording ? "destructive" : "default"}
        size="lg"
        className={cn(
          "h-16 w-16 rounded-full touch-none select-none",
          isRecording && "animate-pulse"
        )}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerUp}
        disabled={disabled || isPreparing}
      >
        {isPreparing ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : isRecording ? (
          <Square className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>
      <p className="text-sm text-muted-foreground">
        {isPreparing
          ? "Preparing..."
          : isRecording
          ? formatDuration(duration)
          : "Hold to record"}
      </p>
    </div>
  );
}
