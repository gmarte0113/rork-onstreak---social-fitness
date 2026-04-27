import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle, Ellipse, G } from "react-native-svg";
import { ArrowRight, Check, Info, Lock, Sparkles } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { getProgram } from "@/constants/programs";
import {
  FOCUS_DESCRIPTIONS,
  FOCUS_LABELS,
  FocusArea,
} from "@/constants/personalizedPlan";

const MAX_SELECTION = 3;

const AREAS: FocusArea[] = ["abs", "arms", "legs", "full_body"];

export default function PlanSetupScreen() {
  const { state, startPersonalizedPlan } = useApp();
  const isPremium = state.isPremium;
  const [selected, setSelected] = useState<FocusArea[]>([]);
  const [limitMsg, setLimitMsg] = useState<boolean>(false);

  const toggle = async (area: FocusArea) => {
    if (!isPremium) {
      router.push("/paywall");
      return;
    }
    if (Platform.OS !== "web") {
      await Haptics.selectionAsync();
    }
    setSelected((prev) => {
      if (prev.includes(area)) {
        return prev.filter((a) => a !== area);
      }
      if (prev.length >= MAX_SELECTION) {
        setLimitMsg(true);
        setTimeout(() => setLimitMsg(false), 2200);
        return prev;
      }
      return [...prev, area];
    });
  };

  const isSelected = (a: FocusArea) => selected.includes(a);

  const canStart = isPremium && selected.length > 0;

  const activeEnrollment = state.activeEnrollment;
  const otherProgram =
    activeEnrollment?.kind === "program"
      ? getProgram(activeEnrollment.programId)
      : null;

  const proceed = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    startPersonalizedPlan(selected);
    router.replace("/plan");
  };

  const onStart = async () => {
    if (!canStart) return;
    if (activeEnrollment?.kind === "program" && otherProgram) {
      if (Platform.OS === "web") {
        proceed();
        return;
      }
      Alert.alert(
        "Switch to Personalized Plan?",
        `${otherProgram.title} will be paused. Your daily task will come from your Personalized Plan from now on.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Switch", style: "destructive", onPress: proceed },
        ]
      );
      return;
    }
    await proceed();
  };

  const highlight = useMemo(() => {
    return {
      abs: isSelected("abs") || isSelected("full_body"),
      arms: isSelected("arms") || isSelected("full_body"),
      legs: isSelected("legs") || isSelected("full_body"),
      chest: isSelected("arms") || isSelected("full_body"),
    };
  }, [selected]);

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ title: "Personalized Plan" }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Build your plan</Text>
        <Text style={styles.sub}>
          Tap the areas you want to focus on. Pick up to 3.
        </Text>

        <View style={styles.bodyWrap}>
          <BodyDiagram
            highlight={highlight}
            onTap={toggle}
            disabled={!isPremium}
            accent={Colors.primary}
          />

          {!isPremium && (
            <View style={styles.lockedOverlay} pointerEvents="none">
              <View style={styles.lockBadge}>
                <Lock color={Colors.accent} size={18} />
              </View>
            </View>
          )}
        </View>

        {limitMsg && (
          <View style={styles.limitMsg}>
            <Info color={Colors.accent} size={14} />
            <Text style={styles.limitText}>
              You can select up to {MAX_SELECTION} focus areas
            </Text>
          </View>
        )}

        <View style={styles.chips}>
          {AREAS.map((a) => {
            const on = isSelected(a);
            return (
              <TouchableOpacity
                key={a}
                onPress={() => toggle(a)}
                activeOpacity={0.85}
                style={[
                  styles.chip,
                  on && styles.chipActive,
                  !isPremium && styles.chipDisabled,
                ]}
                testID={`focus-${a}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chipLabel, on && styles.chipLabelActive]}>
                    {FOCUS_LABELS[a]}
                  </Text>
                  <Text style={styles.chipDesc}>{FOCUS_DESCRIPTIONS[a]}</Text>
                </View>
                <View
                  style={[
                    styles.checkBubble,
                    on && styles.checkBubbleActive,
                  ]}
                >
                  {on && <Check color={Colors.bg} size={14} strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {!isPremium ? (
          <View style={styles.lockedCard}>
            <View style={styles.lockIconBig}>
              <Lock color={Colors.accent} size={22} />
            </View>
            <Text style={styles.lockedTitle}>
              Unlock personalized plans tailored to your body
            </Text>
            <Text style={styles.lockedSub}>
              Pick your focus areas and get a progressive 60-day plan built
              just for you.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/paywall")}
              style={styles.ctaWrap}
              activeOpacity={0.85}
              testID="plan-upgrade"
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Sparkles color={Colors.text} size={18} />
                <Text style={styles.ctaText}>Upgrade to Pro</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={onStart}
            disabled={!canStart}
            activeOpacity={0.85}
            style={[styles.ctaWrap, !canStart && { opacity: 0.4 }]}
            testID="start-plan"
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>
                {selected.length === 0
                  ? "Select focus areas"
                  : "Generate my plan"}
              </Text>
              <ArrowRight color={Colors.text} size={20} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function BodyDiagram({
  highlight,
  onTap,
  disabled,
  accent,
}: {
  highlight: { abs: boolean; arms: boolean; legs: boolean; chest: boolean };
  onTap: (area: FocusArea) => void;
  disabled: boolean;
  accent: string;
}) {
  const base = Colors.surfaceElevated;
  const stroke = Colors.border;
  const active = accent;
  const muted = "#2A2A30";

  const armsFill = highlight.arms ? active : muted;
  const chestFill = highlight.chest ? active : muted;
  const absFill = highlight.abs ? active : muted;
  const legsFill = highlight.legs ? active : muted;

  const handleArms = () => !disabled && onTap("arms");
  const handleAbs = () => !disabled && onTap("abs");
  const handleLegs = () => !disabled && onTap("legs");

  const W = 220;
  const H = 360;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: W, height: H }}>
        <Svg width={W} height={H} viewBox="0 0 220 360" pointerEvents="none">
          <G>
            <Circle cx="110" cy="38" r="26" fill={base} stroke={stroke} strokeWidth={1.5} />

            <Path
              d="M82 66 Q110 58 138 66 L142 92 Q110 98 78 92 Z"
              fill={chestFill}
              stroke={stroke}
              strokeWidth={1.5}
            />

            <Path
              d="M82 66 Q64 72 58 96 L50 150 Q60 158 70 152 L78 96 Z"
              fill={armsFill}
              stroke={stroke}
              strokeWidth={1.5}
            />
            <Path
              d="M138 66 Q156 72 162 96 L170 150 Q160 158 150 152 L142 96 Z"
              fill={armsFill}
              stroke={stroke}
              strokeWidth={1.5}
            />
            <Ellipse
              cx="52"
              cy="170"
              rx="11"
              ry="18"
              fill={armsFill}
              stroke={stroke}
              strokeWidth={1.5}
            />
            <Ellipse
              cx="168"
              cy="170"
              rx="11"
              ry="18"
              fill={armsFill}
              stroke={stroke}
              strokeWidth={1.5}
            />

            <Path
              d="M78 92 Q110 102 142 92 L146 172 Q110 182 74 172 Z"
              fill={absFill}
              stroke={stroke}
              strokeWidth={1.5}
            />

            <Path
              d="M76 172 Q110 182 144 172 L138 266 Q122 270 112 270 L110 176 Q108 270 98 270 L82 266 Z"
              fill={legsFill}
              stroke={stroke}
              strokeWidth={1.5}
            />
            <Path
              d="M82 266 L90 340 Q100 344 110 340 L112 270 Q108 270 98 270 Z"
              fill={legsFill}
              stroke={stroke}
              strokeWidth={1.5}
            />
            <Path
              d="M138 266 L130 340 Q120 344 110 340 L110 270 Q122 270 138 270 Z"
              fill={legsFill}
              stroke={stroke}
              strokeWidth={1.5}
            />
          </G>
        </Svg>

        <TouchableOpacity
          activeOpacity={0.7}
          disabled={disabled}
          onPress={handleArms}
          style={[styles.hit, { left: 42, top: 58, width: 136, height: 40 }]}
          testID="hit-chest"
        />
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={disabled}
          onPress={handleArms}
          style={[styles.hit, { left: 36, top: 60, width: 44, height: 130 }]}
          testID="hit-arm-left"
        />
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={disabled}
          onPress={handleArms}
          style={[styles.hit, { left: 140, top: 60, width: 44, height: 130 }]}
          testID="hit-arm-right"
        />
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={disabled}
          onPress={handleAbs}
          style={[styles.hit, { left: 70, top: 92, width: 80, height: 86 }]}
          testID="hit-abs"
        />
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={disabled}
          onPress={handleLegs}
          style={[styles.hit, { left: 70, top: 178, width: 80, height: 170 }]}
          testID="hit-legs"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 80 },
  title: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sub: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 10,
    lineHeight: 20,
  },
  bodyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 8,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,10,11,0.55)",
    borderRadius: 16,
  },
  lockBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,182,39,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,182,39,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  limitMsg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,182,39,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,182,39,0.25)",
    marginBottom: 14,
  },
  limitText: { color: Colors.accent, fontSize: 12, fontWeight: "700" },
  chips: { gap: 8, marginBottom: 20 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(255,107,53,0.08)",
  },
  chipDisabled: { opacity: 0.6 },
  chipLabel: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  chipLabelActive: { color: Colors.text },
  chipDesc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  checkBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBubbleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ctaWrap: { borderRadius: 14, overflow: "hidden" },
  cta: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
  },
  ctaText: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },
  lockedCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },
  lockIconBig: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,182,39,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  lockedTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  hit: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  lockedSub: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
  },
});
