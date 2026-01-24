import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { View, Text, Pressable, Alert } from "react-native";
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
  const details: string[] = [];
  if (set.reps !== null) {
    details.push(`${set.reps} reps`);
  }
  if (set.weightKg !== null) {
    details.push(`${set.weightKg} kg`);
  }
  if (set.durationMinutes !== null) {
    details.push(`${set.durationMinutes} min`);
  }

  const isCardio = set.exerciseType === "cardio";

  return (
    <Pressable onLongPress={handleDelete}>
      {({ pressed }) => (
        <View
          className={`px-4 py-3 flex-row items-center justify-between bg-card border-b border-border/40 ${
            pressed ? "bg-muted/50" : ""
          }`}
        >
          <View className="flex-row items-center flex-1">
            <View
              className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                isCardio ? "bg-accent/10" : "bg-secondary/10"
              }`}
            >
              <Text
                className={`font-sans-semibold text-sm ${
                  isCardio ? "text-accent" : "text-secondary"
                }`}
              >
                {setNumber}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-foreground font-sans-medium">
                {details.join(" × ") || "—"}
              </Text>
              {set.notes && (
                <Text
                  className="text-muted-foreground text-sm font-sans"
                  numberOfLines={1}
                >
                  {set.notes}
                </Text>
              )}
            </View>
          </View>
          <View
            className={`px-2.5 py-1 rounded-full ${
              isCardio ? "bg-accent/15" : "bg-secondary/15"
            }`}
          >
            <Text
              className={`text-xs font-sans-medium capitalize ${
                isCardio ? "text-accent" : "text-secondary"
              }`}
            >
              {set.exerciseType}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
