import { useState, useRef, useCallback } from "react";
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, AudioModule } from "expo-audio";
import type { RecordingState } from "@voicefit/shared/types";

export function useVoiceRecorder() {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const requestPermissions = useCallback(async () => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    return status.granted;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordingUri(null);

      // Check permissions
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setError("Microphone permission is required");
        setState("error");
        return false;
      }

      // Configure audio mode for recording
      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Start recording
      audioRecorder.record();
      setState("recording");
      return true;
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to start recording");
      setState("error");
      return false;
    }
  }, [audioRecorder, requestPermissions]);

  const stopRecording = useCallback(async () => {
    try {
      if (!audioRecorder.isRecording) {
        return null;
      }

      await audioRecorder.stop();
      setState("idle");

      const uri = audioRecorder.uri;
      if (uri) {
        setRecordingUri(uri);
        return uri;
      }

      return null;
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setError("Failed to stop recording");
      setState("error");
      return null;
    }
  }, [audioRecorder]);

  const cancelRecording = useCallback(async () => {
    try {
      if (audioRecorder.isRecording) {
        await audioRecorder.stop();
      }
      setState("idle");
      setRecordingUri(null);
      setError(null);
    } catch (err) {
      console.error("Failed to cancel recording:", err);
    }
  }, [audioRecorder]);

  const reset = useCallback(() => {
    setState("idle");
    setRecordingUri(null);
    setError(null);
  }, []);

  return {
    state,
    setState,
    error,
    recordingUri,
    isRecording: recorderState.isRecording,
    durationMs: recorderState.durationMillis,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    requestPermissions,
  };
}
