import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
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

export const MedalViewerModal = React.memo(function MedalViewerModal({
  visible,
  onClose,
  uri,
  title,
  subtitle,
}: Props) {
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
    }
  }, [visible, enter]);

  const enterScale = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
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
            style={[
              styles.medalWrap,
              {
                opacity: enter,
                transform: [{ scale: enterScale }],
              },
            ]}
          >
            <Image
              source={{ uri }}
              style={{ width: MEDAL_SIZE, height: MEDAL_SIZE, backgroundColor: "transparent" }}
              contentFit="contain"
              transition={250}
            />
          </Animated.View>

          <Animated.View style={{ opacity: enter, alignItems: "center" }}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
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
    marginBottom: 16,
    backgroundColor: "transparent",
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
});
