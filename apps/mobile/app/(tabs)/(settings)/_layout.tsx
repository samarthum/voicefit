import { Stack } from "expo-router";

import { HeaderTitle } from "@/components/ui/header";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: false,
        headerTransparent: false,
        headerStyle: {
          backgroundColor: "#f8fafc",
          elevation: 6,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
          zIndex: 1,
        },
        headerTitleAlign: "left",
        headerTitleContainerStyle: {
          paddingHorizontal: 16,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <HeaderTitle title="Settings" />,
        }}
      />
    </Stack>
  );
}
