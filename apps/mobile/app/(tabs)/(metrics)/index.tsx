import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, parseISO } from "date-fns";
import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConversationInput } from "@/components/conversation-input";
import { apiClient } from "@/lib/api-client";

interface DailyMetric {
  date: string;
  steps: number | null;
  weightKg: number | null;
}

export default function MetricsScreen() {
  const { getToken } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const {
    data: metrics,
    isLoading,
    refetch,
    error,
  } = useQuery<DailyMetric[]>({
    queryKey: ["daily-metrics", startDate, endDate],
    queryFn: async () => {
      const token = await getToken();
      const response = await apiClient<{ metrics: DailyMetric[] }>(
        `/api/daily-metrics?startDate=${startDate}&endDate=${endDate}`,
        { token }
      );
      return response.metrics;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Get the most recent values
  const latestWeight = metrics?.find((m) => m.weightKg !== null)?.weightKg;
  const latestSteps = metrics?.find((m) => m.steps !== null)?.steps;

  // Filter to only days with data
  const metricsWithData = metrics?.filter(
    (m) => m.steps !== null || m.weightKg !== null
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Stats */}
        <View className="flex-row gap-4 pt-4 mb-6">
          <View className="flex-1 bg-card border border-border rounded-xl p-4">
            <Text className="text-muted-foreground text-sm">Latest Weight</Text>
            <Text className="text-foreground text-2xl font-bold mt-1">
              {latestWeight ? `${latestWeight.toFixed(1)} kg` : "—"}
            </Text>
          </View>
          <View className="flex-1 bg-card border border-border rounded-xl p-4">
            <Text className="text-muted-foreground text-sm">Latest Steps</Text>
            <Text className="text-foreground text-2xl font-bold mt-1">
              {latestSteps ? latestSteps.toLocaleString() : "—"}
            </Text>
          </View>
        </View>

        {/* History */}
        <Text className="text-foreground font-semibold text-lg mb-3">
          Last 30 Days
        </Text>

        {isLoading ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : error ? (
          <View className="items-center justify-center py-10">
            <Text className="text-destructive">Failed to load metrics</Text>
          </View>
        ) : metricsWithData?.length === 0 ? (
          <View className="items-center justify-center py-10">
            <Text className="text-4xl mb-3">📊</Text>
            <Text className="text-muted-foreground text-center">
              No metrics logged yet.{"\n"}Use voice to log your weight or steps!
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {metricsWithData?.map((metric) => (
              <View
                key={metric.date}
                className="bg-card border border-border rounded-xl p-4 flex-row justify-between items-center"
              >
                <Text className="text-foreground font-medium">
                  {format(parseISO(metric.date), "EEE, MMM d")}
                </Text>
                <View className="flex-row gap-4">
                  {metric.weightKg !== null && (
                    <View className="items-end">
                      <Text className="text-muted-foreground text-xs">Weight</Text>
                      <Text className="text-foreground font-semibold">
                        {metric.weightKg.toFixed(1)} kg
                      </Text>
                    </View>
                  )}
                  {metric.steps !== null && (
                    <View className="items-end">
                      <Text className="text-muted-foreground text-xs">Steps</Text>
                      <Text className="text-foreground font-semibold">
                        {metric.steps.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Voice Input */}
      <ConversationInput onEntryLogged={refetch} />
    </SafeAreaView>
  );
}
