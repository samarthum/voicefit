import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Animated,
  Platform,
  ScrollView,
  LayoutAnimation,
} from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  Mic,
  Square,
  Send,
  Keyboard as KeyboardIcon,
  X,
  Sparkles,
  UtensilsCrossed,
  Dumbbell,
  Footprints,
  Scale,
} from "lucide-react-native";
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
import { Button } from "@/components/ui/button";

interface ConversationInputProps {
  onEntryLogged?: () => void;
  defaultIntent?: "meal" | "workout_set";
  sessionId?: string;
}

const suggestions = [
  { label: "Meal", icon: UtensilsCrossed, value: "Had " },
  { label: "Workout", icon: Dumbbell, value: "Did " },
  { label: "Steps", icon: Footprints, value: "Steps today: " },
  { label: "Weight", icon: Scale, value: "Weight today: " },
];

export function ConversationInput({
  onEntryLogged,
  defaultIntent,
  sessionId,
}: ConversationInputProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.2)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const [textInput, setTextInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [interpretation, setInterpretation] =
    useState<InterpretEntryResponse | null>(null);
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

  // Ambient glow animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.35,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.2,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [glowAnim]);

  // Expand/collapse animation
  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: showTextInput ? 1 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 12,
    }).start();
  }, [showTextInput, expandAnim]);

  // Pulse animation for recording
  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
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
    handleCollapse();
  };

  // Handle suggestion tap
  const handleSuggestionTap = (value: string) => {
    setTextInput(value);
    handleExpand();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Expand with animation
  const handleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowTextInput(true);
  };

  // Collapse with animation
  const handleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowTextInput(false);
    setTextInput("");
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

  const isProcessing =
    state === "uploading" ||
    state === "transcribing" ||
    state === "interpreting";

  const glowColor = isRecording
    ? "rgba(239, 68, 68, 0.4)"
    : "rgba(34, 197, 94, 0.35)";

  return (
    <>
      {/* Floating Command Center */}
      <View
        className="absolute bottom-0 left-0 right-0 px-4"
        style={{
          paddingBottom: Platform.OS === "ios" ? 34 : 20,
        }}
      >
        {showTextInput ? (
          /* Expanded Text Input State */
          <BlurView
            intensity={80}
            tint="light"
            className="rounded-3xl overflow-hidden border border-border/70"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.12,
              shadowRadius: 28,
              elevation: 12,
            }}
          >
            <View className="bg-card/95">
              {/* Header */}
              <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
                <View className="flex-row items-center gap-2">
                  <Sparkles size={16} color="#16a34a" />
                  <Text className="text-xs font-sans-medium uppercase tracking-wider text-muted-foreground">
                    Command Center
                  </Text>
                </View>
                <Pressable
                  onPress={handleCollapse}
                  className="w-8 h-8 rounded-full bg-muted/60 items-center justify-center"
                >
                  <X size={16} color="#6b7280" />
                </Pressable>
              </View>

              {/* Suggestion Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="px-4 pb-3"
                contentContainerStyle={{ gap: 8 }}
              >
                {suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion.label}
                    onPress={() => handleSuggestionTap(suggestion.value)}
                    className="flex-row items-center gap-2 px-3 py-2 rounded-full bg-muted/60 border border-border/60"
                  >
                    <suggestion.icon size={16} color="#6b7280" />
                    <Text className="text-sm text-muted-foreground font-sans">
                      {suggestion.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Input Area */}
              <View className="px-4 pb-4">
                <View className="flex-row items-center bg-background border border-border/70 rounded-2xl px-4">
                  <TextInput
                    ref={inputRef}
                    className="flex-1 py-3 text-foreground text-base font-sans"
                    placeholder="Log a meal, workout, or ask..."
                    placeholderTextColor="#6b7280"
                    value={textInput}
                    onChangeText={setTextInput}
                    autoFocus
                    returnKeyType="send"
                    onSubmitEditing={handleTextSubmit}
                    blurOnSubmit={false}
                    multiline
                    numberOfLines={2}
                    style={{ maxHeight: 80 }}
                  />
                  <View className="flex-row items-center gap-2 ml-2">
                    {!textInput.trim() && (
                      <Pressable
                        onPress={handleMicPress}
                        disabled={isProcessing}
                        className={`w-10 h-10 rounded-xl items-center justify-center ${
                          isRecording ? "bg-destructive" : "bg-muted/60"
                        }`}
                      >
                        {isRecording ? (
                          <Square size={16} color="#fff" fill="#fff" />
                        ) : (
                          <Mic size={16} color="#6b7280" />
                        )}
                      </Pressable>
                    )}
                    <Pressable
                      onPress={handleTextSubmit}
                      disabled={!textInput.trim() || isProcessing}
                      className="w-10 h-10 rounded-xl items-center justify-center overflow-hidden"
                    >
                      {textInput.trim() ? (
                        <LinearGradient
                          colors={["#16a34a", "#15803d"]}
                          className="w-full h-full items-center justify-center"
                        >
                          <Send size={16} color="#f0fdf4" />
                        </LinearGradient>
                      ) : (
                        <View className="w-full h-full bg-muted/60 items-center justify-center">
                          <Send size={16} color="#6b7280" />
                        </View>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </BlurView>
        ) : (
          /* Collapsed State */
          <View className="relative">
            {/* Ambient Glow */}
            <Animated.View
              style={{
                position: "absolute",
                top: "50%",
                right: 24,
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: glowColor,
                transform: [{ translateY: -40 }],
                opacity: glowAnim,
              }}
              pointerEvents="none"
            />

            <BlurView
              intensity={60}
              tint="light"
              className="rounded-full overflow-hidden border border-border/70"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 18,
                elevation: 8,
              }}
            >
              <View className="bg-card/95 flex-row items-center gap-3 p-2 pl-4">
                {/* Expand trigger */}
                <Pressable
                  onPress={handleExpand}
                  className="flex-1 flex-row items-center gap-3"
                >
                  <Sparkles size={16} color="#16a34a" opacity={0.6} />
                  <Text className="text-sm text-muted-foreground font-sans flex-1">
                    Log a meal, workout, or ask...
                  </Text>
                </Pressable>

                {/* Keyboard Toggle */}
                <Pressable
                  onPress={handleExpand}
                  className="w-10 h-10 rounded-full bg-muted/60 items-center justify-center"
                >
                  <KeyboardIcon size={18} color="#6b7280" />
                </Pressable>

                {/* Mic Button - Hero Element */}
                <Animated.View
                  style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}
                >
                  <Pressable
                    onPress={handleMicPress}
                    disabled={isProcessing}
                    className="w-12 h-12 rounded-full items-center justify-center overflow-hidden"
                    style={{
                      shadowColor: isRecording ? "#ef4444" : "#16a34a",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                      elevation: 6,
                    }}
                  >
                    {isProcessing ? (
                      <View className="w-full h-full bg-muted items-center justify-center">
                        <ActivityIndicator color="white" size="small" />
                      </View>
                    ) : isRecording ? (
                      <View className="w-full h-full bg-destructive items-center justify-center">
                        <Square size={20} color="#fff" fill="#fff" />
                      </View>
                    ) : (
                      <LinearGradient
                        colors={["#16a34a", "#15803d"]}
                        className="w-full h-full items-center justify-center"
                      >
                        <Mic size={20} color="#f0fdf4" />
                      </LinearGradient>
                    )}
                  </Pressable>
                </Animated.View>

                {/* Duration Display */}
                {isRecording && (
                  <View className="bg-destructive/10 px-3 py-1.5 rounded-full">
                    <Text className="text-destructive font-sans-medium text-sm tabular-nums">
                      {formatDuration(durationMs)}
                    </Text>
                  </View>
                )}
              </View>
            </BlurView>
          </View>
        )}

        {/* Status Text */}
        {state !== "idle" &&
          state !== "recording" &&
          state !== "reviewing" && (
            <View className="flex-row items-center justify-center gap-2 mt-3">
              <Animated.View
                className="w-1.5 h-1.5 rounded-full bg-primary"
                style={{
                  opacity: glowAnim.interpolate({
                    inputRange: [0.2, 0.35],
                    outputRange: [0.5, 1],
                  }),
                }}
              />
              <Text className="text-muted-foreground text-sm font-sans">
                {state === "uploading" && "Uploading..."}
                {state === "transcribing" && "Transcribing..."}
                {state === "interpreting" && "Analyzing..."}
                {state === "error" && "Something went wrong. Try again."}
              </Text>
            </View>
          )}
      </View>

      {/* Interpretation Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={["50%", "80%"]}
        enablePanDownToClose
        onClose={handleCancel}
        backgroundStyle={{
          backgroundColor: "#ffffff",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: "#d1d5db",
          width: 40,
        }}
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 16,
        }}
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
          {(interpretation?.intent === "weight" ||
            interpretation?.intent === "steps") && (
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
              <Text className="text-foreground text-base font-sans mb-4">
                {interpretation.payload.answer}
              </Text>
              <Button onPress={handleCancel}>Done</Button>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    </>
  );
}
