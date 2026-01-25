import type { ComponentType } from "react";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  Utensils,
  Dumbbell,
  Activity,
  Settings,
} from "lucide-react-native";

// Tab icon component aligned to web Lucide icons across platforms
function TabIcon({
  color,
  focused,
  icon: Icon,
}: {
  color: string;
  focused: boolean;
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
}) {
  return (
    <Icon
      color={color}
      size={24}
      strokeWidth={focused ? 2.2 : 2}
    />
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  const tabBarHeight = (Platform.OS === "ios" ? 60 : 56) + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: "#6b7280",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "rgba(15, 23, 42, 0.12)",
          paddingBottom: bottomPadding,
          height: tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          fontFamily: "DMSans-Medium",
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              icon={Home}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(meals)"
        options={{
          title: "Meals",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              icon={Utensils}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(workouts)"
        options={{
          title: "Workouts",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              icon={Dumbbell}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(metrics)"
        options={{
          title: "Metrics",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              icon={Activity}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(settings)"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              icon={Settings}
            />
          ),
        }}
      />
    </Tabs>
  );
}
