import { Stack } from "expo-router";

import { HeaderBackground, HeaderTitle } from "@/components/ui/header";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeLayout() {
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
          headerTitle: () => (
            <HeaderTitle
              title={getGreeting()}
              subtitle="Let's track your wellness"
            />
          ),
        }}
      />
    </Stack>
  );
}
