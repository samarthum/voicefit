import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Animated,
  Platform,
} from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import type {
  InterpretEntryResponse,
  MealInterpretation,
  WorkoutSetInterpretation,
  MetricInterpretation,
} from "@voicefit/shared/types";

import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { apiClient, uploadAudio } from "@/lib/api-client";
import { MealInterpretationSheet } from "@/components/meal-interpretation-sheet";
import { WorkoutSetInterpretationSheet } from "@/components/workout-set-interpretation-sheet";
import { MetricInterpretationSheet } from "@/components/metric-interpretation-sheet";

interface ConversationInputProps {
  onEntryLogged?: () => void;
  defaultIntent?: "meal" | "workout_set";
  sessionId?: string;
}

export function ConversationInput({
  onEntryLogged,
  defaultIntent,
  sessionId,
}: ConversationInputProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [textInput, setTextInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [interpretation, setInterpretation] = useState<InterpretEntryResponse | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);

  const {
    state,
    setState,
    isRecording,
    durationMs,
    startRecording,
    stopRecording,
    reset,
  } = useVoiceRecorder();

  // Pulse animation for recording
  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  // Transcribe mutation
  const transcribeMutation = useMutation({
    mutationFn: async (audioUri: string) => {
      const token = await getToken();
      return uploadAudio(audioUri, token);
    },
    onSuccess: (data) => {
      setTranscript(data.transcript);
      interpretMutation.mutate(data.transcript);
    },
    onError: () => {
      setState("error");
    },
  });

  // Interpret mutation
  const interpretMutation = useMutation({
    mutationFn: async (text: string) => {
      const token = await getToken();
      return apiClient<InterpretEntryResponse>("/api/interpret/entry", {
        method: "POST",
        body: { transcript: text },
        token,
      });
    },
    onSuccess: (data) => {
      setInterpretation(data);
      setState("reviewing");
      bottomSheetRef.current?.snapToIndex(0);
    },
    onError: () => {
      setState("error");
    },
  });

  // Handle mic button tap
  const handleMicPress = async () => {
    if (isRecording) {
      // Stop recording and transcribe
      stopPulse();
      setState("uploading");
      const uri = await stopRecording();
      if (uri) {
        setState("transcribing");
        transcribeMutation.mutate(uri);
      } else {
        reset();
      }
    } else {
      // Start recording
      const started = await startRecording();
      if (started) {
        startPulse();
      }
    }
  };

  // Handle text submission
  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    Keyboard.dismiss();
    setTranscript(textInput.trim());
    setState("interpreting");
    interpretMutation.mutate(textInput.trim());
    setTextInput("");
    setShowTextInput(false);
  };

  // Handle interpretation confirmation
  const handleConfirm = useCallback(() => {
    bottomSheetRef.current?.close();
    setInterpretation(null);
    setTranscript("");
    reset();
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["meals"] });
    queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["workout-session"] });
    queryClient.invalidateQueries({ queryKey: ["daily-metrics"] });
    onEntryLogged?.();
  }, [onEntryLogged, queryClient, reset]);

  // Handle cancellation
  const handleCancel = useCallback(() => {
    bottomSheetRef.current?.close();
    setInterpretation(null);
    setTranscript("");
    reset();
  }, [reset]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isProcessing = state === "uploading" || state === "transcribing" || state === "interpreting";

  return (
    <>
      {/* Floating Input Bar */}
      <View
        className="absolute bottom-0 left-0 right-0 pb-6 px-4"
        style={{
          paddingBottom: Platform.OS === "ios" ? 34 : 20,
        }}
      >
        {showTextInput ? (
          <View className="bg-card border border-border rounded-2xl shadow-lg flex-row items-center px-4">
            <TextInput
              className="flex-1 py-4 text-foreground text-base"
              placeholder="Type what you ate or did..."
              placeholderTextColor="#9ca3af"
              value={textInput}
              onChangeText={setTextInput}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleTextSubmit}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={() => setShowTextInput(false)}
              className="p-2"
            >
              <Text className="text-muted-foreground">✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleTextSubmit}
              disabled={!textInput.trim()}
              className={`ml-2 px-4 py-2 rounded-lg ${
                textInput.trim() ? "bg-primary" : "bg-muted"
              }`}
            >
              <Text
                className={textInput.trim() ? "text-white font-medium" : "text-muted-foreground"}
              >
                Send
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row items-center justify-center gap-4">
            {/* Text Input Toggle */}
            <TouchableOpacity
              onPress={() => setShowTextInput(true)}
              className="bg-card border border-border w-12 h-12 rounded-full items-center justify-center shadow-lg"
              activeOpacity={0.7}
            >
              <Text className="text-lg">⌨️</Text>
            </TouchableOpacity>

            {/* Mic Button */}
            <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
              <TouchableOpacity
                onPress={handleMicPress}
                disabled={isProcessing}
                className={`w-16 h-16 rounded-full items-center justify-center shadow-lg ${
                  isRecording
                    ? "bg-destructive"
                    : isProcessing
                    ? "bg-muted"
                    : "bg-primary"
                }`}
                activeOpacity={0.7}
              >
                {isProcessing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-2xl">
                    {isRecording ? "⬛" : "🎙️"}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Duration Display */}
            {isRecording && (
              <View className="bg-card border border-border px-4 py-2 rounded-full">
                <Text className="text-foreground font-medium">
                  {formatDuration(durationMs)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Status Text */}
        {state !== "idle" && state !== "recording" && state !== "reviewing" && (
          <Text className="text-muted-foreground text-center text-sm mt-2">
            {state === "uploading" && "Uploading audio..."}
            {state === "transcribing" && "Transcribing..."}
            {state === "interpreting" && "Understanding..."}
            {state === "error" && "Something went wrong. Try again."}
          </Text>
        )}
      </View>

      {/* Interpretation Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={["50%", "80%"]}
        enablePanDownToClose
        onClose={handleCancel}
        backgroundStyle={{ backgroundColor: "#ffffff" }}
        handleIndicatorStyle={{ backgroundColor: "#d1d5db" }}
      >
        <BottomSheetView className="flex-1 px-4">
          {interpretation?.intent === "meal" && (
            <MealInterpretationSheet
              interpretation={interpretation.payload as MealInterpretation}
              transcript={transcript}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          )}
          {interpretation?.intent === "workout_set" && (
            <WorkoutSetInterpretationSheet
              interpretation={interpretation.payload as WorkoutSetInterpretation}
              transcript={transcript}
              sessionId={sessionId}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          )}
          {(interpretation?.intent === "weight" || interpretation?.intent === "steps") && (
            <MetricInterpretationSheet
              interpretation={interpretation.payload as MetricInterpretation}
              intent={interpretation.intent}
              transcript={transcript}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          )}
          {interpretation?.intent === "question" && (
            <View className="py-4">
              <Text className="text-foreground text-base mb-4">
                {interpretation.payload.answer}
              </Text>
              <TouchableOpacity
                onPress={handleCancel}
                className="bg-primary py-3 rounded-xl items-center"
              >
                <Text className="text-white font-semibold">Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    </>
  );
}
