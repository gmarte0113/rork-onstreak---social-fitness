import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle, Platform } from "react-native";
import { Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";

type Props = {
  size?: number;
  color?: string;
  bgColor?: string;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  testID?: string;
};

export default function AnimatedCheckmark({
  size = 88,
  color = "#FFFFFF",
  bgColor = Colors.primary,
  style,
  haptic = true,
  testID,
}: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (haptic && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 180,
        mass: 0.6,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(ringScale, {
        toValue: 1.6,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity, ringScale, ringOpacity, haptic]);

  return (
    <View style={[styles.wrap, { width: size * 1.6, height: size * 1.6 }, style]} testID={testID}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: bgColor,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <Check color={color} size={size * 0.5} strokeWidth={3.5} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 3,
  },
  circle: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
});
