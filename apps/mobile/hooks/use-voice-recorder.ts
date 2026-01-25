import { useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
import type { RecordingState } from "@voicefit/shared/types";

export function useVoiceRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const requestPermissions = useCallback(async () => {
    const { status } = await Audio.requestPermissionsAsync();
    return status === "granted";
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordingUri(null);
      setDurationMs(0);

      console.log("[VoiceRecorder] Starting recording flow...");

      // Check permissions
      const hasPermission = await requestPermissions();
      console.log("[VoiceRecorder] Permission granted:", hasPermission);
      if (!hasPermission) {
        setError("Microphone permission is required");
        setState("error");
        return false;
      }

      // Configure audio mode for recording
      console.log("[VoiceRecorder] Setting audio mode...");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      console.log("[VoiceRecorder] Creating recording...");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      console.log("[VoiceRecorder] Recording started!");

      setIsRecording(true);
      setState("recording");

      // Start duration timer
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTime);
      }, 100);

      return true;
    } catch (err) {
      console.error("[VoiceRecorder] Failed to start recording:", err);
      setError("Failed to start recording");
      setState("error");
      return false;
    }
  }, [requestPermissions]);

  const stopRecording = useCallback(async () => {
    try {
      console.log("[VoiceRecorder] Stopping recording...");

      // Stop duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      if (!recordingRef.current) {
        console.log("[VoiceRecorder] No recording to stop");
        return null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      console.log("[VoiceRecorder] Recording stopped, uri:", uri);

      recordingRef.current = null;
      setIsRecording(false);
      setState("idle");

      if (uri) {
        setRecordingUri(uri);
        return uri;
      }

      return null;
    } catch (err) {
      console.error("[VoiceRecorder] Failed to stop recording:", err);
      setError("Failed to stop recording");
      setState("error");
      return null;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    try {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      setIsRecording(false);
      setState("idle");
      setRecordingUri(null);
      setError(null);
      setDurationMs(0);
    } catch (err) {
      console.error("[VoiceRecorder] Failed to cancel recording:", err);
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setRecordingUri(null);
    setError(null);
    setDurationMs(0);
  }, []);

  return {
    state,
    setState,
    error,
    recordingUri,
    isRecording,
    durationMs,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    requestPermissions,
  };
}
