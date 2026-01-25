import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import type { DashboardData } from "@voicefit/shared/types";

import { TodaySummaryCard } from "@/components/today-summary-card";
import { WeeklyTrendsCard } from "@/components/weekly-trends-card";
import { ConversationInput } from "@/components/conversation-input";
import { apiClient } from "@/lib/api-client";

export default function HomeScreen() {
  const { getToken } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: dashboard,
    isLoading,
    refetch,
    error,
  } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<DashboardData>("/api/dashboard", { token });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={["bottom"]}>
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Text className="text-destructive text-center">
            Failed to load dashboard. Pull to retry.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Summary */}
        {dashboard && (
          <>
            <TodaySummaryCard data={dashboard.today} />
            <View className="mt-4">
              <WeeklyTrendsCard
                data={dashboard.weeklyTrends}
                calorieGoal={dashboard.today.calories.goal}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Voice Input */}
      <ConversationInput onEntryLogged={refetch} />
    </SafeAreaView>
  );
}
