import { Stack } from "expo-router";

import { HeaderBackground, HeaderTitle } from "@/components/ui/header";

export default function WorkoutsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: false,
        headerShadowVisible: false,
        headerTransparent: false,
        headerStyle: {
          backgroundColor: "transparent",
        },
        headerBackground: () => <HeaderBackground />,
        headerTitleAlign: "left",
        headerTitleContainerStyle: {
          paddingHorizontal: 16,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <HeaderTitle title="Workouts" />,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: () => <HeaderTitle title="Workout" />,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          headerTitle: () => <HeaderTitle title="New Workout" />,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
