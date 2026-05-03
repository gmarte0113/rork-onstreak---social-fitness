import React, { useMemo } from "react";
import {
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, Clock, Share2, Sparkles, TrendingUp } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useApp } from "@/providers/AppProvider";
import { toDateKey } from "@/constants/workouts";

export default function GlobalRecapScreen() {
  const { state } = useApp();
  const insets = useSafeAreaInsets();

  const consistency = useMemo(() => {
    const now = new Date();
    let done = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      if (state.completedDates.includes(toDateKey(d))) done += 1;
    }
    return { done, pct: Math.round((done / 30) * 100) };
  }, [state.completedDates]);

  const formatTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h <= 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const share = async () => {
    try {
      await Share.share({
        message: `My last 30 days on OnStreak: ${consistency.done} workouts, ${state.totalReps} reps, ${state.streak} day streak.`,
      });
    } catch (e) {
      console.log("share", e);
    }
  };

  return (
    <View style={styles.safe}>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 56 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>YOUR LAST 30 DAYS</Text>
        <Text style={styles.title}>
          You showed up<Text style={styles.titleDot}>.</Text>
        </Text>
        <Text style={styles.sub}>
          A snapshot of everything you&apos;ve done this month.
        </Text>

        <View style={styles.big}>
          <CardGlow />
          <Text style={styles.bigValue}>{consistency.done}</Text>
          <Text style={styles.bigLabel}>workouts completed</Text>
          <View style={styles.track}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${Math.min(100, consistency.pct)}%` }]}
            />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.pctValue}>
              {consistency.pct}% <Text style={styles.pctLabel}>consistency</Text>
            </Text>
            <Text style={styles.daysOf}>{consistency.done} of 30 days</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.statCard}>
            <CardGlow />
            <View style={styles.statIcon}>
              <Share2 color={Colors.primary} size={16} />
            </View>
            <View style={styles.streakRow}>
              <Text style={styles.streakValue}>{state.streak}</Text>
              <Text style={styles.streakUnit}>DAYS</Text>
            </View>
            <Text style={styles.statLabel}>Current streak</Text>
          </View>

          <View style={styles.statCard}>
            <CardGlow />
            <View style={styles.statIcon}>
              <Sparkles color={Colors.primary} size={16} />
            </View>
            <Text style={styles.statValue}>{state.totalReps.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total reps</Text>
          </View>

          <View style={styles.statCard}>
            <CardGlow />
            <View style={styles.statIcon}>
              <Clock color={Colors.primary} size={16} />
            </View>
            <Text style={styles.statValue}>{formatTime(state.totalMinutes)}</Text>
            <Text style={styles.statLabel}>Time spent</Text>
          </View>

          <View style={styles.statCard}>
            <CardGlow />
            <View style={styles.statIcon}>
              <TrendingUp color={Colors.primary} size={16} />
            </View>
            <Text style={styles.statValue}>{state.completedDates.length}</Text>
            <Text style={styles.statLabel}>All-time</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={share}
          activeOpacity={0.85}
          testID="share-global-recap"
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareGradient}
          >
            <Share2 color={Colors.text} size={18} />
            <Text style={styles.shareText}>Share my recap</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Activity color={Colors.textMuted} size={14} />
          <Text style={styles.secondaryText}>Keep the streak alive</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function CardGlow() {
  return (
    <LinearGradient
      colors={["rgba(255,107,53,0.18)", "rgba(255,107,53,0)"]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={styles.cardGlow}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  label: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginTop: 8,
  },
  title: {
    color: Colors.text,
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -1.2,
    marginTop: 8,
    lineHeight: 44,
  },
  titleDot: { color: Colors.primary },
  sub: {
    color: Colors.textMuted,
    fontSize: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  big: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    padding: 24,
    marginBottom: 14,
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  bigValue: {
    color: Colors.text,
    fontSize: 84,
    fontWeight: "900",
    letterSpacing: -3,
    lineHeight: 88,
  },
  bigLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  track: {
    height: 10,
    backgroundColor: "#2A2A30",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 22,
  },
  fill: { height: "100%", borderRadius: 6 },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  pctValue: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  pctLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  daysOf: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 18,
    minHeight: 150,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  statValue: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  streakValue: {
    color: Colors.primary,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
  },
  streakUnit: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  shareBtn: {
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  shareGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  shareText: { color: Colors.text, fontSize: 16, fontWeight: "800" },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    marginTop: 4,
  },
  secondaryText: { color: Colors.textMuted, fontSize: 14, fontWeight: "600" },
});
