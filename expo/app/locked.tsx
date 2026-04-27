import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Lock, Check } from "lucide-react-native";
import { Colors } from "@/constants/colors";

const FEATURES = [
  "Unlock all challenges (Abs, Legs, Reset)",
  "Custom plans tailored to your goal",
  "Advanced progress analytics",
  "Streak protection (1 skip day / week)",
];

export default function LockedScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#2A1810", "#0A0A0B"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.body}>
        <View style={styles.lockCircle}>
          <Lock color={Colors.accent} size={32} />
        </View>
        <Text style={styles.title}>Coming soon</Text>
        <Text style={styles.subtitle}>
          OnStreak Pro is in the works. Here&apos;s what you&apos;ll get:
        </Text>
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <View style={styles.checkWrap}>
                <Check color={Colors.primary} size={14} strokeWidth={3} />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.back()}
          activeOpacity={0.85}
          testID="close-locked"
        >
          <Text style={styles.ctaText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: 28, justifyContent: "center" },
  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,182,39,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  title: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 28,
    lineHeight: 22,
  },
  features: { gap: 14, marginBottom: 40 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { color: Colors.text, fontSize: 15, fontWeight: "500" },
  cta: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: { color: Colors.text, fontSize: 16, fontWeight: "800" },
});
