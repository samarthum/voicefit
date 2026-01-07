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
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Outer container with rings */}
      <div className="relative">
        {/* Outer pulse ring - only when recording */}
        {isRecording && (
          <div className="absolute inset-[-16px] rounded-full bg-destructive/20 animate-pulse-ring" />
        )}

        {/* Middle ambient ring */}
        <div
          className={cn(
            "absolute inset-[-8px] rounded-full transition-all duration-500",
            isRecording
              ? "bg-gradient-to-br from-destructive/30 to-destructive/10 animate-pulse"
              : "bg-gradient-to-br from-primary/20 to-primary/5"
          )}
        />

        {/* Inner glow ring */}
        <div
          className={cn(
            "absolute inset-[-4px] rounded-full transition-all duration-300",
            isRecording
              ? "bg-destructive/20"
              : "bg-primary/10"
          )}
        />

        {/* Main button */}
        <Button
          variant={isRecording ? "destructive" : "default"}
          className={cn(
            "relative h-20 w-20 rounded-full",
            "shadow-xl",
            "transition-all duration-300 ease-out",
            "active:scale-95",
            isRecording
              ? "shadow-destructive/40"
              : "shadow-primary/30",
            !isRecording && !isPreparing && "animate-breathe"
          )}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onPointerCancel={handlePointerUp}
          disabled={disabled || isPreparing}
        >
          {/* Icon with smooth transition */}
          <div className="transition-transform duration-200">
            {isPreparing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isRecording ? (
              <Square className="h-7 w-7" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </div>
        </Button>
      </div>

      {/* Status text */}
      <p
        className={cn(
          "text-sm font-medium transition-all duration-300",
          isRecording ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {isPreparing
          ? "Preparing..."
          : isRecording
          ? formatDuration(duration)
          : "Hold to record"}
      </p>
    </div>
  );
}
