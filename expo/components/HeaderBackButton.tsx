import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
      hitSlop={12}
      testID="header-back-button"
      style={({ pressed }) => [
        styles.wrap,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.circle}>
        <ArrowLeft color="#FFFFFF" size={18} strokeWidth={3} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 1,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
