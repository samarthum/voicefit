import "../global.css";

import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from "@expo-google-fonts/instrument-serif";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

// Clerk token cache using SecureStore
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Handle error silently
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Please set it in your .env file."
  );
}

function AuthGate() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (isSignedIn && inAuthGroup) {
      // Redirect to main app if signed in and on auth screens
      router.replace("/(tabs)/(home)");
    } else if (!isSignedIn && !inAuthGroup) {
      // Redirect to sign-in if not signed in and not on auth screens
      router.replace("/(auth)/sign-in");
    }
  }, [isSignedIn, isLoaded, segments]);

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // DM Sans family
    "DMSans-Regular": DMSans_400Regular,
    "DMSans-Medium": DMSans_500Medium,
    "DMSans-SemiBold": DMSans_600SemiBold,
    "DMSans-Bold": DMSans_700Bold,
    // Instrument Serif family
    "InstrumentSerif-Regular": InstrumentSerif_400Regular,
    "InstrumentSerif-Italic": InstrumentSerif_400Regular_Italic,
    // JetBrains Mono
    "JetBrainsMono-Regular": JetBrainsMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthGate />
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
