import { useOAuth, useAuth } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession();

// Warm up browser for Android to improve UX
const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS === "android") {
      void WebBrowser.warmUpAsync();
      return () => {
        void WebBrowser.coolDownAsync();
      };
    }
  }, []);
};

export default function SignInScreen() {
  useWarmUpBrowser();

  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({
    strategy: "oauth_apple",
  });
  const redirectUrl = AuthSession.makeRedirectUri({
    path: "oauth-native-callback",
  });

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/(tabs)/(home)");
    }
  }, [isLoaded, isSignedIn]);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startGoogleOAuth({
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(tabs)/(home)");
      }
    } catch (err) {
      console.error("Google OAuth error:", err);
    }
  }, [startGoogleOAuth, redirectUrl, router]);

  const handleAppleSignIn = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startAppleOAuth({
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(tabs)/(home)");
      }
    } catch (err) {
      console.error("Apple OAuth error:", err);
    }
  }, [startAppleOAuth, redirectUrl, router]);

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 justify-center">
        {/* Logo and Title */}
        <View className="items-center mb-12">
          <View className="w-20 h-20 bg-primary rounded-2xl items-center justify-center mb-4">
            <Text className="text-4xl">🎙️</Text>
          </View>
          <Text className="text-3xl font-bold text-foreground">VoiceFit</Text>
          <Text className="text-muted-foreground text-center mt-2">
            Track your health with your voice
          </Text>
        </View>

        {/* Sign In Buttons */}
        <View className="gap-4">
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            className="flex-row items-center justify-center bg-white border border-border rounded-xl py-4 px-6"
            activeOpacity={0.7}
          >
            <Text className="text-xl mr-3">🔵</Text>
            <Text className="text-foreground font-semibold text-base">
              Continue with Google
            </Text>
          </TouchableOpacity>

          {Platform.OS === "ios" && (
            <TouchableOpacity
              onPress={handleAppleSignIn}
              className="flex-row items-center justify-center bg-black rounded-xl py-4 px-6"
              activeOpacity={0.7}
            >
              <Text className="text-xl mr-3">🍎</Text>
              <Text className="text-white font-semibold text-base">
                Continue with Apple
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <Text className="text-muted-foreground text-center text-sm mt-8 px-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}
