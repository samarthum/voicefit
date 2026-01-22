import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { SymbolView, SymbolViewProps } from "expo-symbols";
import { View, Text } from "react-native";

// Tab icon component that uses SF Symbols on iOS and fallback on Android
function TabIcon({
  name,
  color,
  focused,
  fallback,
}: {
  name: SymbolViewProps["name"];
  color: string;
  focused: boolean;
  fallback: string;
}) {
  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={name}
        type={focused ? "hierarchical" : "monochrome"}
        tintColor={color}
        style={{ width: 24, height: 24 }}
      />
    );
  }

  // Android fallback with emoji
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>{fallback}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#6b7280",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e7eb",
          paddingBottom: Platform.OS === "ios" ? 0 : 8,
          height: Platform.OS === "ios" ? 85 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="house.fill"
              color={color}
              focused={focused}
              fallback="🏠"
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
              name="fork.knife"
              color={color}
              focused={focused}
              fallback="🍽️"
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
              name="dumbbell.fill"
              color={color}
              focused={focused}
              fallback="💪"
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
              name="chart.line.uptrend.xyaxis"
              color={color}
              focused={focused}
              fallback="📊"
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
              name="gearshape.fill"
              color={color}
              focused={focused}
              fallback="⚙️"
            />
          ),
        }}
      />
    </Tabs>
  );
}
