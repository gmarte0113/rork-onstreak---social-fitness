import React, { useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Lock } from "lucide-react-native";

type Props = {
  uri: string;
  size: number;
  earned: boolean;
  showLock?: boolean;
  enableTilt?: boolean;
  style?: ViewStyle;
};

const MAX_TILT = 5;

export const MedalImage = React.memo(function MedalImage({
  uri,
  size,
  earned,
  showLock = true,
  enableTilt = true,
  style,
}: Props) {
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enableTilt,
        onMoveShouldSetPanResponder: () => enableTilt,
        onPanResponderGrant: () => {
          Animated.spring(scale, {
            toValue: 0.97,
            friction: 6,
            tension: 120,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderMove: (_evt, g) => {
          const half = size / 2;
          const dx = Math.max(-half, Math.min(half, g.dx));
          const dy = Math.max(-half, Math.min(half, g.dy));
          const ry = (dx / half) * MAX_TILT;
          const rx = -(dy / half) * MAX_TILT;
          tiltX.setValue(rx);
          tiltY.setValue(ry);
        },
        onPanResponderRelease: () => {
          Animated.parallel([
            Animated.spring(tiltX, {
              toValue: 0,
              friction: 5,
              tension: 80,
              useNativeDriver: true,
            }),
            Animated.spring(tiltY, {
              toValue: 0,
              friction: 5,
              tension: 80,
              useNativeDriver: true,
            }),
            Animated.spring(scale, {
              toValue: 1,
              friction: 5,
              tension: 120,
              useNativeDriver: true,
            }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.spring(tiltX, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(tiltY, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [enableTilt, size, tiltX, tiltY, scale]
  );

  const rotateX = tiltX.interpolate({
    inputRange: [-MAX_TILT, MAX_TILT],
    outputRange: [`${-MAX_TILT}deg`, `${MAX_TILT}deg`],
  });
  const rotateY = tiltY.interpolate({
    inputRange: [-MAX_TILT, MAX_TILT],
    outputRange: [`${-MAX_TILT}deg`, `${MAX_TILT}deg`],
  });

  const highlightX = tiltY.interpolate({
    inputRange: [-MAX_TILT, MAX_TILT],
    outputRange: [-size * 0.25, size * 0.25],
  });
  const highlightY = tiltX.interpolate({
    inputRange: [-MAX_TILT, MAX_TILT],
    outputRange: [size * 0.25, -size * 0.25],
  });

  const transform =
    Platform.OS === "web"
      ? [{ scale }]
      : [
          { perspective: 800 },
          { rotateX },
          { rotateY },
          { scale },
        ];

  return (
    <View
      style={[{ width: size, height: size }, style]}
      {...pan.panHandlers}
    >
      <Animated.View
        style={[
          styles.inner,
          {
            transform,
            opacity: earned ? 1 : 0.5,
          },
        ]}
      >
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          contentFit="contain"
          transition={200}
        />
        {earned && Platform.OS !== "web" && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.highlight,
              {
                width: size * 1.1,
                height: size * 0.45,
                transform: [
                  { translateX: highlightX },
                  { translateY: highlightY },
                  { rotate: "20deg" },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[
                "rgba(255,255,255,0)",
                "rgba(255,255,255,0.18)",
                "rgba(255,255,255,0)",
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
      </Animated.View>
      {!earned && showLock && (
        <View style={styles.lockBadge} pointerEvents="none">
          <Lock color="#fff" size={Math.max(12, size * 0.14)} strokeWidth={2.4} />
        </View>
      )}
    </View>
  );
});
const styles = StyleSheet.create({
  inner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  highlight: {
    position: "absolute",
    top: "30%",
    left: "-5%",
  },
  lockBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(15,15,17,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});
