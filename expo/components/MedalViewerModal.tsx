import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { X } from "lucide-react-native";
import { Colors } from "@/constants/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  uri: string;
  title: string;
  subtitle?: string;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const MEDAL_SIZE = Math.min(SCREEN_W * 0.78, SCREEN_H * 0.5);
const MAX_TILT = 18;
const MAX_TRANSLATE = 12;

export const MedalViewerModal = React.memo(function MedalViewerModal({
  visible,
  onClose,
  uri,
  title,
  subtitle,
}: Props) {
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const transX = useRef(new Animated.Value(0)).current;
  const transY = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      enter.setValue(0);
      Animated.spring(enter, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }).start();
    } else {
      tiltX.setValue(0);
      tiltY.setValue(0);
      transX.setValue(0);
      transY.setValue(0);
    }
  }, [visible, enter, tiltX, tiltY, transX, transY]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_e, g) => {
          const half = MEDAL_SIZE / 2;
          const dx = Math.max(-half, Math.min(half, g.dx));
          const dy = Math.max(-half, Math.min(half, g.dy));
          tiltY.setValue((dx / half) * MAX_TILT);
          tiltX.setValue(-(dy / half) * MAX_TILT);
          transX.setValue((dx / half) * MAX_TRANSLATE);
          transY.setValue((dy / half) * MAX_TRANSLATE);
        },
        onPanResponderRelease: () => {
          Animated.parallel([
            Animated.spring(tiltX, { toValue: 0, friction: 6, tension: 60, useNativeDriver: true }),
            Animated.spring(tiltY, { toValue: 0, friction: 6, tension: 60, useNativeDriver: true }),
            Animated.spring(transX, { toValue: 0, friction: 6, tension: 60, useNativeDriver: true }),
            Animated.spring(transY, { toValue: 0, friction: 6, tension: 60, useNativeDriver: true }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.spring(tiltX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(tiltY, { toValue: 0, useNativeDriver: true }),
            Animated.spring(transX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(transY, { toValue: 0, useNativeDriver: true }),
          ]).start();
        },
      }),
    [tiltX, tiltY, transX, transY]
  );

  const rotateX = tiltX.interpolate({
    inputRange: [-MAX_TILT, MAX_TILT],
    outputRange: [`${-MAX_TILT}deg`, `${MAX_TILT}deg`],
  });
  const rotateY = tiltY.interpolate({
    inputRange: [-MAX_TILT, MAX_TILT],
    outputRange: [`${-MAX_TILT}deg`, `${MAX_TILT}deg`],
  });

  const enterScale = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });
  const enterOpacity = enter;

  const transform =
    Platform.OS === "web"
      ? [{ translateX: transX }, { translateY: transY }, { scale: enterScale }]
      : [
          { perspective: 900 },
          { translateX: transX },
          { translateY: transY },
          { rotateX },
          { rotateY },
          { scale: enterScale },
        ];

  const highlightX = tiltY.interpolate({
    inputRange: [-MAX_TILT, MAX_TILT],
    outputRange: [-MEDAL_SIZE * 0.25, MEDAL_SIZE * 0.25],
  });
  const highlightY = tiltX.interpolate({
    inputRange: [-MAX_TILT, MAX_TILT],
    outputRange: [MEDAL_SIZE * 0.25, -MEDAL_SIZE * 0.25],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} testID="medal-viewer-backdrop">
        {Platform.OS !== "web" ? (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.webBackdrop]} />
        )}
        <View style={styles.dim} pointerEvents="none" />

        <Pressable
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={12}
          testID="medal-viewer-close"
        >
          <X color="#fff" size={22} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.content} pointerEvents="box-none">
          <Animated.View
            {...pan.panHandlers}
            style={[
              styles.medalWrap,
              {
                width: MEDAL_SIZE,
                height: MEDAL_SIZE,
                opacity: enterOpacity,
                transform,
              },
            ]}
          >
            <Image
              source={{ uri }}
              style={{ width: MEDAL_SIZE, height: MEDAL_SIZE, backgroundColor: "transparent" }}
              contentFit="contain"
              transition={250}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.highlight,
                {
                  width: MEDAL_SIZE * 0.6,
                  height: MEDAL_SIZE * 0.6,
                  borderRadius: MEDAL_SIZE * 0.3,
                  transform: [
                    { translateX: highlightX },
                    { translateY: highlightY },
                  ],
                },
              ]}
            />
          </Animated.View>

          <Animated.View style={{ opacity: enterOpacity, alignItems: "center" }}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
            <Text style={styles.hint}>Swipe to tilt</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  webBackdrop: {
    backgroundColor: "rgba(10,10,12,0.85)",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  closeBtn: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  medalWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  highlight: {
    position: "absolute",
    top: "10%",
    left: "10%",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  hint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 18,
    letterSpacing: 0.5,
  },
});
