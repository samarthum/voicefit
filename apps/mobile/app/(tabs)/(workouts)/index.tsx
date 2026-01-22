import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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
import { format, parseISO } from "date-fns";
import type { WorkoutSessionDisplay } from "@voicefit/shared/types";

import { apiClient } from "@/lib/api-client";

export default function WorkoutsScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: sessions,
    isLoading,
    refetch,
    error,
  } = useQuery<WorkoutSessionDisplay[]>({
    queryKey: ["workout-sessions"],
    queryFn: async () => {
      const token = await getToken();
      const response = await apiClient<{ sessions: WorkoutSessionDisplay[] }>(
        "/api/workout-sessions",
        { token }
      );
      return response.sessions;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleNewWorkout = () => {
    router.push("/(tabs)/(workouts)/new");
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
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
            <Text className="text-destructive">Failed to load workouts</Text>
          </View>
        ) : sessions?.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-4xl mb-3">💪</Text>
            <Text className="text-muted-foreground text-center mb-4">
              No workouts yet.{"\n"}Start your first workout!
            </Text>
            <TouchableOpacity
              onPress={handleNewWorkout}
              className="bg-primary px-6 py-3 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-white font-semibold">Start Workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3 pt-4">
            {sessions?.map((session) => (
              <TouchableOpacity
                key={session.id}
                onPress={() => router.push(`/(tabs)/(workouts)/${session.id}`)}
                className="bg-card border border-border rounded-xl p-4"
                activeOpacity={0.7}
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="text-foreground font-semibold text-base">
                      {session.title}
                    </Text>
                    <Text className="text-muted-foreground text-sm mt-1">
                      {format(parseISO(session.startedAt), "EEE, MMM d 'at' h:mm a")}
                    </Text>
                  </View>
                  <View className="bg-primary/10 px-3 py-1 rounded-full">
                    <Text className="text-primary font-medium text-sm">
                      {session.setCount} {session.setCount === 1 ? "set" : "sets"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating New Workout Button */}
      {sessions && sessions.length > 0 && (
        <View className="absolute bottom-6 right-6">
          <TouchableOpacity
            onPress={handleNewWorkout}
            className="bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
            activeOpacity={0.7}
          >
            <Text className="text-white text-2xl">+</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
