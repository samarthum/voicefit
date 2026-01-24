import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiClient } from "@/lib/api-client";

export default function NewWorkoutScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const createMutation = useMutation({
    mutationFn: async (workoutTitle: string) => {
      const token = await getToken();
      return apiClient<{ id: string }>("/api/workout-sessions", {
        method: "POST",
        body: { title: workoutTitle },
        token,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      router.replace(`/(tabs)/(workouts)/${data.id}`);
    },
  });

  const handleCreate = () => {
    const workoutTitle = title.trim() || `Workout ${new Date().toLocaleDateString()}`;
    createMutation.mutate(workoutTitle);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-6">
          <Text className="text-muted-foreground text-sm mb-2">
            Workout Title
          </Text>
          <TextInput
            className="bg-card border border-border rounded-xl px-4 py-4 text-foreground text-base"
            placeholder="e.g., Morning Lift, Leg Day"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

          <Text className="text-muted-foreground text-xs mt-2 px-1">
            Leave empty to use today's date as the title
          </Text>
        </View>

        <View className="px-6 pb-6">
          <TouchableOpacity
            onPress={handleCreate}
            disabled={createMutation.isPending}
            className={`py-4 rounded-xl items-center ${
              createMutation.isPending ? "bg-primary/50" : "bg-primary"
            }`}
            activeOpacity={0.7}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Start Workout
              </Text>
            )}
          </TouchableOpacity>

          {createMutation.isError && (
            <Text className="text-destructive text-center mt-3">
              Failed to create workout. Please try again.
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
