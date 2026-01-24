import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { View, Text, Pressable, Alert } from "react-native";
import type { MealLogDisplay } from "@voicefit/shared/types";

import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge, getMealBadgeVariant } from "@/components/ui/badge";

interface MealCardProps {
  meal: MealLogDisplay;
  onDelete?: () => void;
}

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

  const date = parseISO(meal.eatenAt);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Pressable onLongPress={handleDelete}>
      {({ pressed }) => (
        <Card
          className={`border-border/60 bg-card/70 ${pressed ? "opacity-90" : ""}`}
          style={pressed ? { transform: [{ scale: 0.98 }] } : undefined}
        >
          <View className="px-4 py-3">
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-1">
                  <Badge
                    variant={getMealBadgeVariant(meal.mealType)}
                    className="px-2 py-0.5"
                    textClassName="text-[10px]"
                  >
                    {meal.mealType}
                  </Badge>
                  <Text
                    className="text-sm font-sans-medium text-foreground flex-1"
                    numberOfLines={1}
                  >
                    {meal.description}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs text-muted-foreground font-sans">
                    {time}
                  </Text>
                  <Text className="text-xs text-muted-foreground/50 font-sans">
                    ·
                  </Text>
                  <Text className="text-xs text-muted-foreground/70 font-sans">
                    {timeAgo}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-base font-sans-semibold text-accent tabular-nums">
                  {meal.calories}
                </Text>
                <Text className="text-xs text-muted-foreground font-sans">
                  kcal
                </Text>
              </View>
            </View>
          </View>
        </Card>
      )}
    </Pressable>
  );
}
