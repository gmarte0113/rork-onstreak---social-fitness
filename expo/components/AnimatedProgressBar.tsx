import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";

type Props = {
  segments: number;
  filledIndex: number;
  style?: StyleProp<ViewStyle>;
  height?: number;
  trackColor?: string;
  fillColor?: string;
};

export default function AnimatedProgressBar({
  segments,
  filledIndex,
  style,
  height = 4,
  trackColor = "#26262B",
  fillColor = Colors.primary,
}: Props) {
  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: segments }).map((_, i) => (
        <Segment
          key={i}
          active={i <= filledIndex}
          isCurrent={i === filledIndex}
          height={height}
          trackColor={trackColor}
          fillColor={fillColor}
        />
      ))}
    </View>
  );
}

function Segment({
  active,
  isCurrent,
  height,
  trackColor,
  fillColor,
}: {
  active: boolean;
  isCurrent: boolean;
  height: number;
  trackColor: string;
  fillColor: string;
}) {
  const fill = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(fill, {
      toValue: active ? 1 : 0,
      useNativeDriver: false,
      damping: 14,
      stiffness: 140,
      mass: 0.9,
      overshootClamping: false,
    }).start();
  }, [active, fill]);

  const widthPct = fill.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: widthPct,
            backgroundColor: fillColor,
            shadowColor: fillColor,
            shadowOpacity: isCurrent ? 0.55 : 0,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
  },
  track: {
    flex: 1,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
});
