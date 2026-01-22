import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import type { MealLogDisplay } from "@voicefit/shared/types";

import { apiClient } from "@/lib/api-client";

interface MealCardProps {
  meal: MealLogDisplay;
  onDelete?: () => void;
}

const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: "🍳",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

export function MealCard({ meal, onDelete }: MealCardProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient(`/api/meals/${meal.id}`, {
        method: "DELETE",
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDelete?.();
    },
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete Meal",
      "Are you sure you want to delete this meal?",
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

  return (
    <TouchableOpacity
      onLongPress={handleDelete}
      className="bg-card border border-border rounded-xl p-4"
      activeOpacity={0.7}
    >
      <View className="flex-row items-start">
        <Text className="text-2xl mr-3">
          {MEAL_TYPE_EMOJI[meal.mealType] || "🍽️"}
        </Text>
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-2">
              <Text className="text-foreground font-medium" numberOfLines={2}>
                {meal.description}
              </Text>
              <Text className="text-muted-foreground text-sm mt-1 capitalize">
                {meal.mealType} • {format(parseISO(meal.eatenAt), "h:mm a")}
              </Text>
            </View>
            <View className="bg-primary/10 px-3 py-1 rounded-full">
              <Text className="text-primary font-semibold text-sm">
                {meal.calories} kcal
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
