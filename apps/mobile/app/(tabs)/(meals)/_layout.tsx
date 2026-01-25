import { Stack } from "expo-router";

import { HeaderBackground, HeaderTitle } from "@/components/ui/header";

export default function MealsLayout() {
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
          headerTitle: () => <HeaderTitle title="Meal Logs" />,
        }}
      />
    </Stack>
  );
}
