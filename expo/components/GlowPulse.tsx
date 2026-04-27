import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";

type Props = {
  color?: string;
  intensity?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  enabled?: boolean;
};

export default function GlowPulse({
  color = Colors.primary,
  intensity = 0.55,
  radius = 22,
  borderRadius = 16,
  style,
  enabled = true,
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, enabled]);

  const shadowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [intensity * 0.45, intensity],
  });
  const shadowRadius = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [radius * 0.6, radius],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: shadowOpacity as unknown as number,
          shadowRadius: shadowRadius as unknown as number,
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }} />
    </Animated.View>
  );
}
