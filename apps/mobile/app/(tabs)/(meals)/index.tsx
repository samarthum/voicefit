import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, addDays, parseISO } from "date-fns";
import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MealLogDisplay } from "@voicefit/shared/types";

import { MealCard } from "@/components/meal-card";
import { ConversationInput } from "@/components/conversation-input";
import { apiClient } from "@/lib/api-client";

export default function MealsScreen() {
  const { getToken } = useAuth();
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: meals,
    isLoading,
    refetch,
    error,
  } = useQuery<MealLogDisplay[]>({
    queryKey: ["meals", selectedDate],
    queryFn: async () => {
      const token = await getToken();
      const response = await apiClient<{ meals: MealLogDisplay[] }>(
        `/api/meals?date=${selectedDate}`,
        { token }
      );
      return response.meals;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const goToPreviousDay = () => {
    setSelectedDate(format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd"));
  };

  const goToNextDay = () => {
    const tomorrow = addDays(parseISO(selectedDate), 1);
    if (tomorrow <= new Date()) {
      setSelectedDate(format(tomorrow, "yyyy-MM-dd"));
    }
  };

  const goToToday = () => {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  };

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  const totalCalories = meals?.reduce((sum, meal) => sum + meal.calories, 0) ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      {/* Date Navigation */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-card">
        <TouchableOpacity
          onPress={goToPreviousDay}
          className="p-2"
          activeOpacity={0.7}
        >
          <Text className="text-primary text-lg">←</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToToday} activeOpacity={0.7}>
          <Text className="text-foreground font-semibold text-base">
            {isToday
              ? "Today"
              : format(parseISO(selectedDate), "EEE, MMM d")}
          </Text>
          <Text className="text-muted-foreground text-center text-xs">
            {totalCalories} kcal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToNextDay}
          className="p-2"
          activeOpacity={0.7}
          disabled={isToday}
        >
          <Text className={`text-lg ${isToday ? "text-muted" : "text-primary"}`}>
            →
          </Text>
        </TouchableOpacity>
      </View>

      {/* Meals List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-destructive">Failed to load meals</Text>
          </View>
        ) : meals?.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-4xl mb-3">🍽️</Text>
            <Text className="text-muted-foreground text-center">
              No meals logged for this day.{"\n"}Use voice to log your first meal!
            </Text>
          </View>
        ) : (
          <View className="gap-3 pt-4">
            {meals?.map((meal) => (
              <MealCard key={meal.id} meal={meal} onDelete={() => refetch()} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Voice Input */}
      <ConversationInput onEntryLogged={refetch} defaultIntent="meal" />
    </SafeAreaView>
  );
}
