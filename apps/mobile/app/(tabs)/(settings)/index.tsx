import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiClient } from "@/lib/api-client";

interface UserSettings {
  calorieGoal: number;
  stepGoal: number;
}

export default function SettingsScreen() {
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [calorieGoal, setCalorieGoal] = useState("");
  const [stepGoal, setStepGoal] = useState("");

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const token = await getToken();
      const response = await apiClient<UserSettings>("/api/user/settings", {
        token,
      });
      setCalorieGoal(response.calorieGoal.toString());
      setStepGoal(response.stepGoal.toString());
      return response;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<UserSettings>) => {
      const token = await getToken();
      return apiClient("/api/user/settings", {
        method: "PUT",
        body: data,
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      Alert.alert("Success", "Settings updated successfully");
    },
    onError: () => {
      Alert.alert("Error", "Failed to update settings");
    },
  });

  const handleSaveGoals = () => {
    const newCalorieGoal = parseInt(calorieGoal, 10);
    const newStepGoal = parseInt(stepGoal, 10);

    if (isNaN(newCalorieGoal) || newCalorieGoal < 500 || newCalorieGoal > 10000) {
      Alert.alert("Invalid Input", "Calorie goal must be between 500 and 10,000");
      return;
    }

    if (isNaN(newStepGoal) || newStepGoal < 1000 || newStepGoal > 100000) {
      Alert.alert("Invalid Input", "Step goal must be between 1,000 and 100,000");
      return;
    }

    updateMutation.mutate({
      calorieGoal: newCalorieGoal,
      stepGoal: newStepGoal,
    });
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={["bottom"]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {/* Account Section */}
        <View className="pt-4 mb-6">
          <Text className="text-muted-foreground text-sm font-medium mb-3 px-1">
            ACCOUNT
          </Text>
          <View className="bg-card border border-border rounded-xl p-4">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mr-3">
                <Text className="text-primary text-lg font-semibold">
                  {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "?"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-semibold">
                  {user?.fullName || "User"}
                </Text>
                <Text className="text-muted-foreground text-sm">
                  {user?.emailAddresses[0]?.emailAddress}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Daily Goals Section */}
        <View className="mb-6">
          <Text className="text-muted-foreground text-sm font-medium mb-3 px-1">
            DAILY GOALS
          </Text>
          <View className="bg-card border border-border rounded-xl p-4 gap-4">
            <View>
              <Text className="text-foreground font-medium mb-2">
                Calorie Goal
              </Text>
              <TextInput
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                placeholder="2000"
                placeholderTextColor="#9ca3af"
                value={calorieGoal}
                onChangeText={setCalorieGoal}
                keyboardType="number-pad"
              />
              <Text className="text-muted-foreground text-xs mt-1 px-1">
                Daily calorie intake goal (500-10,000 kcal)
              </Text>
            </View>

            <View>
              <Text className="text-foreground font-medium mb-2">
                Step Goal
              </Text>
              <TextInput
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground"
                placeholder="10000"
                placeholderTextColor="#9ca3af"
                value={stepGoal}
                onChangeText={setStepGoal}
                keyboardType="number-pad"
              />
              <Text className="text-muted-foreground text-xs mt-1 px-1">
                Daily step count goal (1,000-100,000 steps)
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSaveGoals}
              disabled={updateMutation.isPending}
              className={`py-3 rounded-lg items-center ${
                updateMutation.isPending ? "bg-primary/50" : "bg-primary"
              }`}
              activeOpacity={0.7}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Save Goals</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View className="mb-6">
          <Text className="text-muted-foreground text-sm font-medium mb-3 px-1">
            APP
          </Text>
          <View className="bg-card border border-border rounded-xl divide-y divide-border">
            <View className="p-4 flex-row justify-between items-center">
              <Text className="text-foreground">Version</Text>
              <Text className="text-muted-foreground">1.0.0</Text>
            </View>
            <TouchableOpacity
              className="p-4"
              activeOpacity={0.7}
              onPress={() => Alert.alert("About", "VoiceFit - Track your health with your voice")}
            >
              <Text className="text-foreground">About VoiceFit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-destructive/10 border border-destructive/20 rounded-xl py-4 items-center"
          activeOpacity={0.7}
        >
          <Text className="text-destructive font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
