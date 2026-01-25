"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isPreparing: boolean;
  audioBlob: Blob | null;
  duration: number;
  error: string | null;
  mimeType: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  reset: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cancelRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIsPreparing(true);
      setAudioBlob(null);
      setDuration(0);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Determine the best supported MIME type
      // Safari on iOS primarily supports audio/mp4, so we prioritize it
      let selectedMimeType = "";

      // Try Safari-friendly formats first (important for iOS)
      if (MediaRecorder.isTypeSupported("audio/mp4")) {
        selectedMimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a.40.2")) {
        selectedMimeType = "audio/mp4;codecs=mp4a.40.2";
      } else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        selectedMimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        selectedMimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        selectedMimeType = "audio/ogg;codecs=opus";
      } else {
        // Fallback - let browser choose
        selectedMimeType = "";
      }

      console.log("Selected MIME type:", selectedMimeType);

      const mediaRecorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      const actualMimeType = selectedMimeType || "audio/webm"; // Default for tracking
      setMimeType(actualMimeType);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Small delay to ensure all data is flushed
        setTimeout(() => {
          if (cancelRef.current) {
            cancelRef.current = false;
            setAudioBlob(null);
            setError(null);
            setDuration(0);
            setIsRecording(false);
            cleanup();
            return;
          }
          if (chunksRef.current.length === 0) {
            setError("No audio data captured. Please try again.");
            setIsRecording(false);
            cleanup();
            return;
          }
          const blob = new Blob(chunksRef.current, { type: actualMimeType });
          // Check if blob has meaningful data (minimum ~0.5s of audio)
          if (blob.size < 5000) {
            setError("Recording too short. Please record for at least 1 second.");
            setIsRecording(false);
            cleanup();
            return;
          }
          setAudioBlob(blob);
          setIsRecording(false);
          cleanup();
        }, 100);
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording failed. Please try again.");
        setIsRecording(false);
        cleanup();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      cancelRef.current = false;
      setIsRecording(true);
      setIsPreparing(false);

      // Update duration every 100ms
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setIsPreparing(false);

      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setError("Microphone access denied. Please allow microphone access and try again.");
        } else if (err.name === "NotFoundError") {
          setError("No microphone found. Please connect a microphone and try again.");
        } else {
          setError("Failed to access microphone. Please check your settings and try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Check minimum duration (1 second) to avoid corrupted audio
      const recordingDuration = Date.now() - startTimeRef.current;
      if (recordingDuration < 1000) {
        setError("Recording too short. Please hold the button for at least 1 second.");
        setIsRecording(false);
        cleanup();
        return;
      }
      // Request any remaining data before stopping
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.requestData();
      }
      mediaRecorderRef.current.stop();
    }
  }, [isRecording, cleanup]);

  const cancelRecording = useCallback(() => {
    cancelRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
    }
    setIsRecording(false);
    setIsPreparing(false);
    setDuration(0);
    setError(null);
  }, [cleanup]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setError(null);
    setIsRecording(false);
    setIsPreparing(false);
    setMimeType(null);
    cleanup();
  }, [cleanup]);

  return {
    isRecording,
    isPreparing,
    audioBlob,
    duration,
    error,
    mimeType,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };
}
