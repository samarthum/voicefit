import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import type { WorkoutSetInterpretation, WorkoutSessionDisplay } from "@voicefit/shared/types";

import { apiClient } from "@/lib/api-client";

interface WorkoutSetInterpretationSheetProps {
  interpretation: WorkoutSetInterpretation;
  transcript: string;
  sessionId?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function WorkoutSetInterpretationSheet({
  interpretation,
  transcript,
  sessionId: providedSessionId,
  onConfirm,
  onCancel,
}: WorkoutSetInterpretationSheetProps) {
  const { getToken } = useAuth();
  const [exerciseName, setExerciseName] = useState(interpretation.exerciseName);
  const [reps, setReps] = useState(interpretation.reps?.toString() ?? "");
  const [weight, setWeight] = useState(interpretation.weightKg?.toString() ?? "");
  const [duration, setDuration] = useState(interpretation.durationMinutes?.toString() ?? "");
  const [notes, setNotes] = useState(interpretation.notes ?? "");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(providedSessionId ?? null);

  // Fetch workout sessions to select from (if no session provided)
  const { data: sessions } = useQuery<WorkoutSessionDisplay[]>({
    queryKey: ["workout-sessions-select"],
    queryFn: async () => {
      const token = await getToken();
      const response = await apiClient<{ sessions: WorkoutSessionDisplay[] }>(
        "/api/workout-sessions?limit=5",
        { token }
      );
      return response.sessions;
    },
    enabled: !providedSessionId,
  });

  // Create new session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient<{ session: { id: string } }>("/api/workout-sessions", {
        method: "POST",
        body: { title: `Workout ${new Date().toLocaleDateString()}` },
        token,
      });
    },
    onSuccess: (data) => {
      setSelectedSessionId(data.session.id);
    },
  });

  // Save workout set mutation
  const saveMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const token = await getToken();
      return apiClient("/api/workout-sets", {
        method: "POST",
        body: {
          sessionId,
          exerciseName,
          exerciseType: interpretation.exerciseType,
          reps: reps ? parseInt(reps, 10) : null,
          weightKg: weight ? parseFloat(weight) : null,
          durationMinutes: duration ? parseInt(duration, 10) : null,
          notes: notes || null,
          transcriptRaw: transcript,
        },
        token,
      });
    },
    onSuccess: onConfirm,
  });

  const handleSave = async () => {
    if (!exerciseName.trim()) {
      Alert.alert("Error", "Exercise name is required");
      return;
    }

    let sessionId = selectedSessionId;

    // If no session selected, create a new one
    if (!sessionId) {
      try {
        const result = await createSessionMutation.mutateAsync();
        sessionId = result.session.id;
      } catch {
        Alert.alert("Error", "Failed to create workout session");
        return;
      }
    }

    saveMutation.mutate(sessionId);
  };

  const confidence = Math.round(interpretation.confidence * 100);
  const isResistance = interpretation.exerciseType === "resistance";
  const isPending = saveMutation.isPending || createSessionMutation.isPending;

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="py-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-foreground font-semibold text-xl">Log Exercise</Text>
          <View className="bg-primary/10 px-3 py-1 rounded-full">
            <Text className="text-primary text-sm font-medium">
              {confidence}% confident
            </Text>
          </View>
        </View>

        {/* Original transcript */}
        <View className="bg-muted rounded-lg p-3 mb-4">
          <Text className="text-muted-foreground text-sm italic">
            "{transcript}"
          </Text>
        </View>

        {/* Session Selection (if not in a workout) */}
        {!providedSessionId && (
          <View className="mb-4">
            <Text className="text-foreground font-medium mb-2">Add to Workout</Text>
            {sessions && sessions.length > 0 ? (
              <View className="gap-2">
                {sessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    onPress={() => setSelectedSessionId(session.id)}
                    className={`px-4 py-3 rounded-lg border ${
                      selectedSessionId === session.id
                        ? "bg-primary/10 border-primary"
                        : "bg-card border-border"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={
                        selectedSessionId === session.id
                          ? "text-primary font-medium"
                          : "text-foreground"
                      }
                    >
                      {session.title}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setSelectedSessionId(null)}
                  className={`px-4 py-3 rounded-lg border ${
                    selectedSessionId === null
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={
                      selectedSessionId === null
                        ? "text-primary font-medium"
                        : "text-foreground"
                    }
                  >
                    + Start New Workout
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text className="text-muted-foreground text-sm">
                This will start a new workout session.
              </Text>
            )}
          </View>
        )}

        {/* Exercise Name */}
        <Text className="text-foreground font-medium mb-2">Exercise</Text>
        <TextInput
          className="bg-card border border-border rounded-lg px-4 py-3 text-foreground mb-4"
          value={exerciseName}
          onChangeText={setExerciseName}
          placeholder="Exercise name"
          placeholderTextColor="#9ca3af"
        />

        {/* Reps & Weight (for resistance) */}
        {isResistance ? (
          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Text className="text-foreground font-medium mb-2">Reps</Text>
              <TextInput
                className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View className="flex-1">
              <Text className="text-foreground font-medium mb-2">Weight (kg)</Text>
              <TextInput
                className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
        ) : (
          <View className="mb-4">
            <Text className="text-foreground font-medium mb-2">Duration (minutes)</Text>
            <TextInput
              className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#9ca3af"
            />
          </View>
        )}

        {/* Notes */}
        <Text className="text-foreground font-medium mb-2">Notes (optional)</Text>
        <TextInput
          className="bg-card border border-border rounded-lg px-4 py-3 text-foreground mb-4"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes..."
          placeholderTextColor="#9ca3af"
        />

        {/* Assumptions */}
        {interpretation.assumptions.length > 0 && (
          <View className="mb-4">
            <Text className="text-muted-foreground text-sm mb-1">
              Assumptions made:
            </Text>
            {interpretation.assumptions.map((assumption, index) => (
              <Text key={index} className="text-muted-foreground text-sm">
                • {assumption}
              </Text>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row gap-3 mt-2">
          <TouchableOpacity
            onPress={onCancel}
            className="flex-1 bg-muted py-3 rounded-xl items-center"
            activeOpacity={0.7}
          >
            <Text className="text-foreground font-semibold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isPending}
            className={`flex-1 py-3 rounded-xl items-center ${
              isPending ? "bg-primary/50" : "bg-primary"
            }`}
            activeOpacity={0.7}
          >
            {isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Save Set</Text>
            )}
          </TouchableOpacity>
        </View>

        {saveMutation.isError && (
          <Text className="text-destructive text-center text-sm mt-3">
            Failed to save. Please try again.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
