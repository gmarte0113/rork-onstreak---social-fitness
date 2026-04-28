import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Satisfy_400Regular } from "@expo-google-fonts/satisfy";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "@/providers/AppProvider";
import { Colors } from "@/constants/colors";
import { MedalModal } from "@/components/MedalModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PostHogProvider } from "posthog-react-native";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.bg },
        headerTitleStyle: { color: Colors.text, fontWeight: "700" },
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.bg },
        animation: "fade",
        animationDuration: 280,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="workout" options={{ presentation: "modal", title: "Today's Workout" }} />
      <Stack.Screen name="workout-photo" options={{ presentation: "fullScreenModal", headerShown: false }} />
      <Stack.Screen name="log-weight" options={{ presentation: "modal", title: "Log Weight" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="locked" options={{ presentation: "modal", title: "Premium" }} />
      <Stack.Screen name="paywall" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="program/[id]" options={{ title: "Program" }} />
      <Stack.Screen name="recap/global" options={{ title: "30-Day Recap" }} />
      <Stack.Screen name="recap/[id]" options={{ title: "Recap" }} />
      <Stack.Screen name="group/[id]" options={{ title: "Group" }} />
      <Stack.Screen name="group/chat/[id]" options={{ title: "Chat" }} />
      <Stack.Screen name="insights" options={{ title: "Insights" }} />
      <Stack.Screen name="plan/setup" options={{ title: "Personalized Plan" }} />
      <Stack.Screen name="plan/index" options={{ title: "My Plan" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Satisfy_400Regular });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AppProvider>
            <PostHogProvider
              apiKey="phc_wMXaBaoaDp9WSVMZ2GBgj8GNc7j8Xxg34Cs54EZZX6DS"
              options={{ host: "https://us.i.posthog.com", enableSessionReplay: false }}
              autocapture={{ captureTouches: true, captureLifecycleEvents: true, captureScreens: true }}
            >
              <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
                <StatusBar style="light" />
                <RootLayoutNav />
                <MedalModal />
              </GestureHandlerRootView>
            </PostHogProvider>
          </AppProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
