import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { format, parseISO } from "date-fns";
import type { WorkoutSetDisplay } from "@voicefit/shared/types";

import { WorkoutSetCard } from "@/components/workout-set-card";
import { ConversationInput } from "@/components/conversation-input";
import { apiClient } from "@/lib/api-client";

interface WorkoutSessionDetail {
  id: string;
  title: string;
  startedAt: string;
  endedAt: string | null;
  sets: WorkoutSetDisplay[];
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: session,
    isLoading,
    refetch,
    error,
  } = useQuery<WorkoutSessionDetail>({
    queryKey: ["workout-session", id],
    queryFn: async () => {
      const token = await getToken();
      return apiClient<WorkoutSessionDetail>(`/api/workout-sessions/${id}`, {
        token,
      });
    },
    enabled: !!id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Group sets by exercise
  const groupedSets = session?.sets.reduce(
    (acc, set) => {
      if (!acc[set.exerciseName]) {
        acc[set.exerciseName] = [];
      }
      acc[set.exerciseName].push(set);
      return acc;
    },
    {} as Record<string, WorkoutSetDisplay[]>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={["bottom"]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (error || !session) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6" edges={["bottom"]}>
        <Text className="text-destructive text-center">
          Failed to load workout. Pull to retry.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Info */}
        <View className="bg-card border border-border rounded-xl p-4 mt-4 mb-4">
          <Text className="text-foreground font-semibold text-lg">
            {session.title}
          </Text>
          <Text className="text-muted-foreground text-sm mt-1">
            {format(parseISO(session.startedAt), "EEEE, MMMM d 'at' h:mm a")}
          </Text>
          <View className="flex-row mt-3 gap-4">
            <View className="bg-primary/10 px-3 py-2 rounded-lg">
              <Text className="text-primary font-medium">
                {session.sets.length} {session.sets.length === 1 ? "set" : "sets"}
              </Text>
            </View>
            <View className="bg-success/10 px-3 py-2 rounded-lg">
              <Text className="text-success font-medium">
                {Object.keys(groupedSets || {}).length} exercises
              </Text>
            </View>
          </View>
        </View>

        {/* Sets by Exercise */}
        {session.sets.length === 0 ? (
          <View className="items-center justify-center py-10">
            <Text className="text-4xl mb-3">💪</Text>
            <Text className="text-muted-foreground text-center">
              No sets logged yet.{"\n"}Use voice to log your exercises!
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {Object.entries(groupedSets || {}).map(([exerciseName, sets]) => (
              <View key={exerciseName} className="bg-card border border-border rounded-xl overflow-hidden">
                <View className="bg-muted px-4 py-3 border-b border-border">
                  <Text className="text-foreground font-semibold">
                    {exerciseName}
                  </Text>
                </View>
                <View className="divide-y divide-border">
                  {sets.map((set, index) => (
                    <WorkoutSetCard
                      key={set.id}
                      set={set}
                      setNumber={index + 1}
                      onDelete={() => refetch()}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Voice Input */}
      <ConversationInput
        onEntryLogged={refetch}
        defaultIntent="workout_set"
        sessionId={id}
      />
    </SafeAreaView>
  );
}
