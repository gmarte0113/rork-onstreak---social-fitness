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
import { ChatReadProvider } from "@/providers/ChatReadProvider";
import { Colors } from "@/constants/colors";
import { MedalModal } from "@/components/MedalModal";
import { ReviewPromptModal } from "@/components/ReviewPromptModal";
import { HeaderBackButton } from "@/components/HeaderBackButton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { setAnalyticsClient } from "@/utils/analytics";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AnalyticsBootstrapper() {
  const posthog = usePostHog();
  useEffect(() => {
    setAnalyticsClient(posthog ?? null);
    return () => {
      setAnalyticsClient(null);
    };
  }, [posthog]);
  return null;
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerBackTitleVisible: false,
        headerStyle: { backgroundColor: Colors.bg },
        headerTitleStyle: { color: Colors.text, fontWeight: "700" },
        headerTintColor: Colors.text,
        headerLeft: ({ canGoBack }) => (canGoBack ? <HeaderBackButton canGoBack={canGoBack} /> : null),
        contentStyle: { backgroundColor: Colors.bg },
        animation: "fade",
        animationDuration: 280,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="workout" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="workout-photo" options={{ presentation: "fullScreenModal", headerShown: false }} />
      <Stack.Screen name="log-weight" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="locked" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="paywall" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="program/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="recap/global" options={{ headerShown: false }} />
      <Stack.Screen name="recap/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="group/chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="insights" options={{ headerShown: false }} />
      <Stack.Screen name="plan/setup" options={{ headerShown: false }} />
      <Stack.Screen name="plan/index" options={{ headerShown: false }} />
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
            <ChatReadProvider>
            <PostHogProvider
              apiKey="phc_wMXaBaoaDp9WSVMZ2GBgj8GNc7j8Xxg34Cs54EZZX6DS"
              options={{ host: "https://us.i.posthog.com", enableSessionReplay: false }}
              autocapture={{ captureTouches: true, captureLifecycleEvents: true, captureScreens: true }}
            >
              <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
                <AnalyticsBootstrapper />
                <StatusBar style="light" />
                <RootLayoutNav />
                <MedalModal />
                <ReviewPromptModal />
              </GestureHandlerRootView>
            </PostHogProvider>
            </ChatReadProvider>
          </AppProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
