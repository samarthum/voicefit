import { Stack } from "expo-router";

export default function WorkoutsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: "#ffffff",
        },
        headerTitleStyle: {
          fontWeight: "600",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Workouts",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Workout",
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: "New Workout",
          headerLargeTitle: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
