import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Award, Share2, X } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { getMedal } from "@/constants/medals";
import { useApp } from "@/providers/AppProvider";

export function MedalModal() {
  const { pendingMedal, dismissMedal, state } = useApp();
  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pendingMedal) {
      scale.setValue(0);
      fade.setValue(0);
      rotate.setValue(0);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
          () => {}
        );
      }
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(rotate, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [pendingMedal, scale, fade, rotate]);

  if (!pendingMedal) return null;
  const medal = getMedal(pendingMedal.id);
  if (!medal) return null;

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const share = async () => {
    try {
      await Share.share({
        message: `I just earned the ${medal.title} on OnStreak! 🔥 ${state.streak} day streak and counting.`,
      });
    } catch (e) {
      console.log("share error", e);
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!pendingMedal}
      onRequestClose={dismissMedal}
    >
      <Pressable style={styles.backdrop} onPress={dismissMedal}>
        <LinearGradient
          colors={["rgba(0,0,0,0.8)", "rgba(0,0,0,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
      </Pressable>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            { opacity: fade, transform: [{ scale }] },
          ]}
        >
          <TouchableOpacity
            style={styles.close}
            onPress={dismissMedal}
            testID="close-medal"
          >
            <X color={Colors.text} size={18} />
          </TouchableOpacity>

          <Text style={styles.congrats}>NEW MEDAL UNLOCKED</Text>

          <Animated.View
            style={[
              styles.medalWrap,
              { transform: [{ rotate: spin }] },
            ]}
          >
            <LinearGradient
              colors={[medal.color, "#ffffff22", medal.color]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.medalRing}
            >
              <View
                style={[styles.medalInner, { backgroundColor: medal.bg }]}
              >
                <Award color={medal.color} size={58} strokeWidth={2.4} />
              </View>
            </LinearGradient>
          </Animated.View>

          <Text style={styles.title}>{medal.title}</Text>
          <Text style={styles.subtitle}>{medal.subtitle}</Text>

          <View style={[styles.streakBadge, { borderColor: medal.color }]}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakText}>
              {pendingMedal.meta?.streak
                ? `${pendingMedal.meta.streak} day streak`
                : "OnStreak"}
            </Text>
          </View>

          <Text style={styles.brand}>ONSTREAK</Text>

          <TouchableOpacity
            style={styles.shareBtn}
            onPress={share}
            activeOpacity={0.85}
            testID="share-medal"
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shareGradient}
            >
              <Share2 color={Colors.text} size={16} />
              <Text style={styles.shareText}>Share</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  close: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  congrats: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 18,
  },
  medalWrap: { marginBottom: 20 },
  medalRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  medalInner: {
    width: "100%",
    height: "100%",
    borderRadius: 66,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    marginTop: 18,
  },
  streakEmoji: { fontSize: 14 },
  streakText: { color: Colors.text, fontSize: 13, fontWeight: "800" },
  brand: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 4,
    marginTop: 16,
  },
  shareBtn: {
    marginTop: 22,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  shareGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  shareText: { color: Colors.text, fontSize: 15, fontWeight: "800" },
});
