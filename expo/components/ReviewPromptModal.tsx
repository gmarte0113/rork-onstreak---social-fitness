import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Star } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import {
  markReviewPromptSeen,
  requestNativeReview,
  subscribeReviewPrompt,
} from "@/lib/review";

export function ReviewPromptModal() {
  const [visible, setVisible] = useState<boolean>(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    const unsub = subscribeReviewPrompt(() => {
      setVisible(true);
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      scale.setValue(0.92);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  const close = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.94,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  const onYes = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    await markReviewPromptSeen();
    close();
    setTimeout(() => {
      requestNativeReview().catch((e) =>
        console.log("[ReviewPromptModal] native review error", e)
      );
    }, 220);
  };

  const onNo = async () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    await markReviewPromptSeen();
    close();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onNo}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onNo} />
        <Animated.View
          style={[
            styles.card,
            { opacity, transform: [{ scale }] },
          ]}
          testID="review-prompt-modal"
        >
          <View style={styles.iconWrap}>
            <Star color={Colors.primary} size={26} fill={Colors.primary} />
          </View>
          <Text style={styles.title}>Enjoying OnStreak so far?</Text>
          <Text style={styles.subtitle}>
            Your feedback helps us keep building the best streak app for you.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={onNo}
              activeOpacity={0.85}
              testID="review-not-really"
            >
              <Text style={styles.btnSecondaryText}>Not really</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={onYes}
              activeOpacity={0.85}
              testID="review-yes"
            >
              <Text style={styles.btnPrimaryText}>Yes</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
  },
  btnSecondary: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnPrimaryText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  btnSecondaryText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
});
