import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
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
      hitSlop={12}
      testID="header-back-button"
      style={({ pressed }) => [
        styles.wrap,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.circle}>
        <ChevronLeft color="#FFFFFF" size={22} strokeWidth={2.75} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 4,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
