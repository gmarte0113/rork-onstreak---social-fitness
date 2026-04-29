import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ArrowRight,
  Zap,
  Trophy,
  Sparkles,
  Target,
  Rocket,
  Lock,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import {
  getChallenges,
  getProgram,
  Program,
  FREE_PROGRAM_ID,
} from "@/constants/programs";
import {
  FOCUS_LABELS,
  PLAN_DURATION_DAYS,
} from "@/constants/personalizedPlan";

const CHALLENGE_ICONS: Record<string, typeof Zap> = {
  "transformation-90": Rocket,
  "abs-30": Zap,
  "legs-21": Trophy,
  "reset-14": Sparkles,
};

const CHALLENGE_THEME: Record<
  string,
  { tagBg: string; tagText: string; tagBorder: string; iconBg: string; tint: string }
> = {
  "transformation-90": {
    tagBg: "rgba(168,85,247,0.12)",
    tagText: "#C084FC",
    tagBorder: "rgba(168,85,247,0.35)",
    iconBg: "rgba(168,85,247,0.18)",
    tint: "#A855F7",
  },
  "abs-30": {
    tagBg: "rgba(255,182,39,0.10)",
    tagText: "#FFC861",
    tagBorder: "rgba(255,182,39,0.35)",
    iconBg: "rgba(255,182,39,0.18)",
    tint: "#FFB627",
  },
  "legs-21": {
    tagBg: "rgba(255,107,53,0.10)",
    tagText: "#FF8B5C",
    tagBorder: "rgba(255,107,53,0.35)",
    iconBg: "rgba(255,107,53,0.18)",
    tint: "#FF6B35",
  },
  "reset-14": {
    tagBg: "rgba(34,197,94,0.10)",
    tagText: "#4ADE80",
    tagBorder: "rgba(34,197,94,0.35)",
    iconBg: "rgba(34,197,94,0.18)",
    tint: "#22C55E",
  },
};

const SHORT_LABEL: Record<string, string> = {
  "transformation-90": "Transformation",
  "abs-30": "Abs",
  "legs-21": "Legs",
  "reset-14": "Reset",
};

const SHORT_SUB: Record<string, string> = {
  "transformation-90": "3 phases · body reset",
  "abs-30": "Core that shows",
  "legs-21": "Stronger in 3 weeks",
  "reset-14": "Get back on track",
};

const SCREEN_W = Dimensions.get("window").width;
const GRID_GAP = 12;
const GRID_PAD = 20;
const CARD_W = (SCREEN_W - GRID_PAD * 2 - GRID_GAP) / 2;

export default function PremiumScreen() {
  const { state, personalizedPlanName } = useApp();
  const isPremium = state.isPremium;
  const challenges = getChallenges();
  const freePlan = getProgram(FREE_PROGRAM_ID);
  const plan = state.personalizedPlan;

  const openProgram = (id: string) => {
    router.push({ pathname: "/program/[id]", params: { id } });
  };

  const onPersonalPress = () => {
    if (!isPremium) {
      router.push("/paywall");
      return;
    }
    router.push(plan ? "/plan" : "/plan/setup");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        testID="programs-screen"
      >
        <Text style={styles.h1}>Pick a program.</Text>
        <Text style={styles.h1Sub}>One at a time. You can switch at any time.</Text>

        {freePlan && (
          <TouchableOpacity
            style={styles.defaultCard}
            activeOpacity={0.85}
            onPress={() => openProgram(freePlan.id)}
            testID="default-program-card"
          >
            <View style={styles.defaultIconWrap}>
              <Zap color={Colors.success} size={22} fill={Colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.defaultLabelRow}>
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>FREE</Text>
                </View>
                <Text style={styles.defaultLabelMuted}> · Default</Text>
              </View>
              <Text style={styles.defaultTitle}>Daily Starter</Text>
              <Text style={styles.defaultSub}>
                30 days · a different workout every day
              </Text>
            </View>
            <ArrowRight color={Colors.textMuted} size={18} />
          </TouchableOpacity>
        )}

        <ProCardWrapper>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPersonalPress}
          testID="personal-plan-card"
          style={styles.proCardOuter}
        >
          <LinearGradient
            colors={["#3A1A0A", "#1A0E08"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.proCardInner}
          >
            <ProCardGlow />
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={styles.proTagWrap}>
                <Text style={styles.proTagText}>FOR YOU · PRO</Text>
              </View>
              <Text style={styles.proTitle}>
                {plan && isPremium ? personalizedPlanName : "Personalized\nPlan"}
              </Text>
              <Text style={styles.proSub}>
                {plan && isPremium
                  ? `Day ${Math.min(plan.currentDay, PLAN_DURATION_DAYS)} · ${plan.focusAreas
                      .map((f) => FOCUS_LABELS[f])
                      .join(" + ")}`
                  : "Built around your focus areas"}
              </Text>
            </View>
            <View style={styles.proIconWrap}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.proIconGradient}
              >
                <Target color={Colors.text} size={28} strokeWidth={2.5} />
              </LinearGradient>
              {!isPremium && (
                <View style={styles.proLockDot}>
                  <Lock color={Colors.text} size={10} />
                </View>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
        </ProCardWrapper>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>CHALLENGES</Text>
          <Text style={styles.sectionCount}>
            {String(challenges.length).padStart(2, "0")}
          </Text>
        </View>

        <View style={styles.grid}>
          {challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              program={c}
              isPremium={isPremium}
              onPress={() => openProgram(c.id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProCardWrapper({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 480,
        delay: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: 180,
        useNativeDriver: true,
        damping: 16,
        stiffness: 160,
        mass: 0.9,
      }),
    ]).start();
  }, [opacity, translateY]);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function ProCardGlow() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.proGlow, { opacity, transform: [{ scale }] }]}
    />
  );
}

function ChallengeCard({
  program,
  isPremium,
  onPress,
}: {
  program: Program;
  isPremium: boolean;
  onPress: () => void;
}) {
  const Icon = CHALLENGE_ICONS[program.id] ?? Zap;
  const theme = CHALLENGE_THEME[program.id] ?? CHALLENGE_THEME["abs-30"];
  const locked = program.premium && !isPremium;
  const label = SHORT_LABEL[program.id] ?? program.title;
  const sub = SHORT_SUB[program.id] ?? program.subtitle;

  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 18, stiffness: 320, mass: 0.6 }).start();
  };
  const onOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 280, mass: 0.6 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], width: CARD_W }}>
    <TouchableOpacity
      style={styles.gridCard}
      activeOpacity={0.9}
      onPressIn={onIn}
      onPressOut={onOut}
      onPress={onPress}
      testID={`program-${program.id}`}
    >
      <LinearGradient
        colors={[theme.tagBg, "rgba(20,20,22,0.4)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.gridTopRow}>
        <View
          style={[
            styles.dayPill,
            { backgroundColor: theme.tagBg, borderColor: theme.tagBorder },
          ]}
        >
          <Text style={[styles.dayPillText, { color: theme.tagText }]}>
            {program.durationDays} DAYS
          </Text>
        </View>
        <View style={[styles.gridIconWrap, { backgroundColor: theme.iconBg }]}>
          <Icon color={theme.tint} size={16} strokeWidth={2.4} />
        </View>
      </View>

      <View style={styles.gridBottom}>
        <View style={styles.gridNumberRow}>
          <Text style={styles.gridNumber}>{program.durationDays}</Text>
          <Text style={styles.gridNumberUnit}>DAYS</Text>
        </View>
        <View style={styles.gridLabelRow}>
          <Text style={styles.gridLabel} numberOfLines={1}>
            {label}
          </Text>
          {locked && <Lock color={Colors.textMuted} size={12} />}
        </View>
        <Text style={styles.gridSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { paddingHorizontal: GRID_PAD, paddingTop: 8, paddingBottom: 140 },
  h1: {
    color: Colors.text,
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1.2,
    marginTop: 8,
  },
  h1Sub: {
    color: Colors.textMuted,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 24,
  },
  defaultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#101012",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
  },
  defaultIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  defaultLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  freeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.4)",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  freeBadgeText: {
    color: "#4ADE80",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  defaultLabelMuted: { color: Colors.textMuted, fontSize: 12 },
  defaultTitle: { color: Colors.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  defaultSub: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },

  proCardOuter: {
    borderRadius: 24,
    marginBottom: 28,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  proCardInner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255,107,53,0.55)",
    overflow: "hidden",
    minHeight: 180,
  },
  proGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,107,53,0.18)",
  },
  proTagWrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.6)",
    backgroundColor: "rgba(255,107,53,0.10)",
    marginBottom: 14,
  },
  proTagText: {
    color: "#FF8B5C",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  proTitle: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 36,
  },
  proSub: {
    color: "#FF8B5C",
    fontSize: 14,
    marginTop: 10,
    fontWeight: "600",
  },
  proIconWrap: {
    alignSelf: "flex-end",
  },
  proIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  proLockDot: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0A0A0B",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  sectionCount: {
    color: Colors.textDim,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  gridCard: {
    aspectRatio: 0.95,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#0F0F11",
    padding: 16,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  gridTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  dayPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  gridIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  gridBottom: {},
  gridNumberRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  gridNumber: {
    color: Colors.text,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1.5,
    lineHeight: 46,
    includeFontPadding: false,
  },
  gridNumberUnit: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  gridLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  gridLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  gridSub: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
