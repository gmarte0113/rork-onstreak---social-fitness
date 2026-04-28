import { Tabs, Redirect } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import FloatingTabBar from "@/components/FloatingTabBar";

export default function TabLayout() {
  const { state, hydrated } = useApp();

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.bg },
        animation: "shift",
        transitionSpec: {
          animation: "timing",
          config: {
            duration: 280,
          },
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="progress" options={{ title: "Activity" }} />
      <Tabs.Screen name="social" options={{ title: "Groups" }} />
      <Tabs.Screen name="premium" options={{ title: "Programs" }} />
    </Tabs>
  );
}
