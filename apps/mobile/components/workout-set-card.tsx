import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import type { WorkoutSetDisplay } from "@voicefit/shared/types";

import { apiClient } from "@/lib/api-client";

interface WorkoutSetCardProps {
  set: WorkoutSetDisplay;
  setNumber: number;
  onDelete?: () => void;
}

export function WorkoutSetCard({ set, setNumber, onDelete }: WorkoutSetCardProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient(`/api/workout-sets/${set.id}`, {
        method: "DELETE",
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-session"] });
      queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDelete?.();
    },
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete Set",
      "Are you sure you want to delete this set?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  // Format the set details based on exercise type
  const details = [];
  if (set.reps !== null) {
    details.push(`${set.reps} reps`);
  }
  if (set.weightKg !== null) {
    details.push(`${set.weightKg} kg`);
  }
  if (set.durationMinutes !== null) {
    details.push(`${set.durationMinutes} min`);
  }

  return (
    <TouchableOpacity
      onLongPress={handleDelete}
      className="px-4 py-3 flex-row items-center justify-between"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center">
        <View className="w-8 h-8 bg-muted rounded-full items-center justify-center mr-3">
          <Text className="text-muted-foreground font-semibold text-sm">
            {setNumber}
          </Text>
        </View>
        <View>
          <Text className="text-foreground font-medium">
            {details.join(" × ") || "—"}
          </Text>
          {set.notes && (
            <Text className="text-muted-foreground text-sm" numberOfLines={1}>
              {set.notes}
            </Text>
          )}
        </View>
      </View>
      <View
        className={`px-2 py-1 rounded ${
          set.exerciseType === "cardio" ? "bg-orange-100" : "bg-blue-100"
        }`}
      >
        <Text
          className={`text-xs font-medium ${
            set.exerciseType === "cardio" ? "text-orange-600" : "text-blue-600"
          }`}
        >
          {set.exerciseType}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
