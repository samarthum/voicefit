import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { format } from "date-fns";
import type { MetricInterpretation } from "@voicefit/shared/types";

import { apiClient } from "@/lib/api-client";

interface MetricInterpretationSheetProps {
  interpretation: MetricInterpretation;
  intent: "weight" | "steps";
  transcript: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MetricInterpretationSheet({
  interpretation,
  intent,
  transcript,
  onConfirm,
  onCancel,
}: MetricInterpretationSheetProps) {
  const { getToken } = useAuth();
  const [value, setValue] = useState(interpretation.value.toString());

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const today = format(new Date(), "yyyy-MM-dd");
      const numValue = intent === "weight" ? parseFloat(value) : parseInt(value, 10);

      return apiClient("/api/daily-metrics", {
        method: "POST",
        body: {
          date: today,
          ...(intent === "weight"
            ? { weightKg: numValue }
            : { steps: numValue }),
          transcriptRaw: transcript,
        },
        token,
      });
    },
    onSuccess: onConfirm,
  });

  const handleSave = () => {
    const numValue = intent === "weight" ? parseFloat(value) : parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;
    saveMutation.mutate();
  };

  const confidence = Math.round(interpretation.confidence * 100);
  const isWeight = intent === "weight";

  return (
    <View className="py-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-foreground font-semibold text-xl">
          Log {isWeight ? "Weight" : "Steps"}
        </Text>
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

      {/* Value Input */}
      <Text className="text-foreground font-medium mb-2">
        {isWeight ? "Weight (kg)" : "Step Count"}
      </Text>
      <TextInput
        className="bg-card border border-border rounded-lg px-4 py-3 text-foreground text-2xl font-semibold text-center mb-4"
        value={value}
        onChangeText={setValue}
        keyboardType={isWeight ? "decimal-pad" : "number-pad"}
        placeholder="0"
        placeholderTextColor="#9ca3af"
      />

      {/* Unit Display */}
      <Text className="text-muted-foreground text-center mb-4">
        {isWeight ? "kilograms" : "steps"}
      </Text>

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
            <Text className="text-white font-semibold">
              Save {isWeight ? "Weight" : "Steps"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {saveMutation.isError && (
        <Text className="text-destructive text-center text-sm mt-3">
          Failed to save. Please try again.
        </Text>
      )}
    </View>
  );
}
