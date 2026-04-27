import React, { useRef } from "react";
import {
  Animated,
  GestureResponderEvent,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticStyle?: "light" | "medium" | "heavy" | "selection" | "none";
  disabled?: boolean;
  testID?: string;
  children?: React.ReactNode;
};

export default function PressableScale({
  style,
  scaleTo = 0.96,
  hapticStyle = "light",
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  children,
  testID,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handleIn = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      damping: 18,
      stiffness: 320,
      mass: 0.7,
    }).start();
    onPressIn?.(e);
  };

  const handleOut = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 14,
      stiffness: 280,
      mass: 0.7,
    }).start();
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (Platform.OS !== "web" && hapticStyle !== "none") {
      const map = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      } as const;
      if (hapticStyle === "selection") {
        Haptics.selectionAsync().catch(() => {});
      } else {
        Haptics.impactAsync(map[hapticStyle]).catch(() => {});
      }
    }
    onPress?.(e);
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={handleIn}
        onPressOut={handleOut}
        onPress={handlePress}
        testID={testID}
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
