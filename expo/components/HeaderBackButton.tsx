import React from "react";
import { Pressable, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Colors } from "@/constants/colors";

export function HeaderBackButton({ canGoBack }: { canGoBack?: boolean }) {
  const router = useRouter();

  const handlePress = () => {
    if (canGoBack) {
      router.back();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      testID="header-back-button"
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
      ]}
    >
      <ArrowLeft color="#FFFFFF" size={20} strokeWidth={2.75} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Platform.OS === "ios" ? -4 : 0,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
