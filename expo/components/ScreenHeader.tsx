import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { Colors } from "@/constants/colors";

type Variant = "floating" | "bar";

interface ScreenHeaderProps {
  title?: string;
  right?: React.ReactNode;
  variant?: Variant;
  testID?: string;
}

export function ScreenHeader({
  title,
  right,
  variant = "floating",
  testID,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const onBack = () => {
    if (router.canGoBack()) router.back();
  };

  const BackButton = (
    <Pressable
      onPress={onBack}
      hitSlop={12}
      style={({ pressed }) => [styles.backWrap, pressed && styles.pressed]}
      testID="screen-header-back"
    >
      <View style={styles.circle}>
        <ChevronLeft color="#FFFFFF" size={22} strokeWidth={2.75} />
      </View>
    </Pressable>
  );

  if (variant === "bar") {
    return (
      <View
        style={[styles.bar, { paddingTop: insets.top + 4 }]}
        testID={testID ?? "screen-header"}
      >
        {BackButton}
        {title ? (
          <Text style={styles.barTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View style={styles.rightSlot}>{right}</View>
      </View>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.floating, { top: insets.top + 6 }]}
      testID={testID ?? "screen-header"}
    >
      <View style={styles.floatingLeft}>{BackButton}</View>
      {right ? <View style={styles.floatingRight}>{right}</View> : null}
    </View>
  );
}

export const SCREEN_HEADER_HEIGHT = 56;

const styles = StyleSheet.create({
  floating: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    zIndex: 20,
  },
  floatingLeft: {},
  floatingRight: {},
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 8,
  },
  barTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  rightSlot: {
    minWidth: 44,
    alignItems: "flex-end",
  },
  backWrap: {
    padding: 4,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
