import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-xl font-bold text-foreground mb-4">
          This screen doesn't exist.
        </Text>
        <Link href="/" className="mt-4">
          <Text className="text-primary text-base underline">
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}
