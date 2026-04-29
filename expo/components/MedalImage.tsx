import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { Lock } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";

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
  const sparkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!earned) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkle, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(sparkle, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [earned, sparkle]);

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

  const transform =
    Platform.OS === "web"
      ? [{ scale }]
      : [
          { perspective: 800 },
          { rotateX },
          { rotateY },
          { scale },
        ];

  const sparkleOpacity = sparkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.25],
  });
  const sparkleScale = sparkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });

  const sparkleSize = Math.max(10, size * 0.14);
  const sparkleOffset = size * 0.12;

  return (
    <View
      style={[styles.wrapper, { width: size, height: size }, style]}
      {...pan.panHandlers}
    >
      <Animated.View
        style={[
          styles.inner,
          {
            width: size,
            height: size,
            transform,
            opacity: earned ? 1 : 0.5,
          },
        ]}
      >
        <Image
          source={{ uri }}
          style={{ width: size, height: size, backgroundColor: "transparent" }}
          contentFit="contain"
          transition={200}
        />
        {earned && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sparkle,
              {
                top: sparkleOffset,
                left: sparkleOffset,
                width: sparkleSize,
                height: sparkleSize,
                opacity: sparkleOpacity,
                transform: [{ scale: sparkleScale }],
              },
            ]}
          >
            <Svg
              width={sparkleSize}
              height={sparkleSize}
              viewBox="0 0 24 24"
            >
              <Path
                d="M12 0 L13.5 10.5 L24 12 L13.5 13.5 L12 24 L10.5 13.5 L0 12 L10.5 10.5 Z"
                fill="#FFF5E6"
              />
            </Svg>
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
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  sparkle: {
    position: "absolute",
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
