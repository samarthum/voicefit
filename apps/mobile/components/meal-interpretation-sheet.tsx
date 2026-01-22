import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import type { MealInterpretation, MealType } from "@voicefit/shared/types";

import { apiClient } from "@/lib/api-client";

interface MealInterpretationSheetProps {
  interpretation: MealInterpretation;
  transcript: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export function MealInterpretationSheet({
  interpretation,
  transcript,
  onConfirm,
  onCancel,
}: MealInterpretationSheetProps) {
  const { getToken } = useAuth();
  const [mealType, setMealType] = useState<MealType>(interpretation.mealType);
  const [description, setDescription] = useState(interpretation.description);
  const [calories, setCalories] = useState(interpretation.calories.toString());

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiClient("/api/meals", {
        method: "POST",
        body: {
          mealType,
          description,
          calories: parseInt(calories, 10),
          eatenAt: new Date().toISOString(),
          transcriptRaw: transcript,
        },
        token,
      });
    },
    onSuccess: onConfirm,
  });

  const handleSave = () => {
    const cal = parseInt(calories, 10);
    if (isNaN(cal) || cal < 0) return;
    if (!description.trim()) return;
    saveMutation.mutate();
  };

  const confidence = Math.round(interpretation.confidence * 100);

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="py-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-foreground font-semibold text-xl">Log Meal</Text>
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

        {/* Meal Type Selector */}
        <Text className="text-foreground font-medium mb-2">Meal Type</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {MEAL_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              onPress={() => setMealType(type.value)}
              className={`px-4 py-2 rounded-lg border ${
                mealType === type.value
                  ? "bg-primary border-primary"
                  : "bg-card border-border"
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={
                  mealType === type.value
                    ? "text-white font-medium"
                    : "text-foreground"
                }
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text className="text-foreground font-medium mb-2">Description</Text>
        <TextInput
          className="bg-card border border-border rounded-lg px-4 py-3 text-foreground mb-4"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
          placeholder="What did you eat?"
          placeholderTextColor="#9ca3af"
        />

        {/* Calories */}
        <Text className="text-foreground font-medium mb-2">Calories</Text>
        <TextInput
          className="bg-card border border-border rounded-lg px-4 py-3 text-foreground mb-4"
          value={calories}
          onChangeText={setCalories}
          keyboardType="number-pad"
          placeholder="0"
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
            disabled={saveMutation.isPending}
            className={`flex-1 py-3 rounded-xl items-center ${
              saveMutation.isPending ? "bg-primary/50" : "bg-primary"
            }`}
            activeOpacity={0.7}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Save Meal</Text>
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
