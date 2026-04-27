import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { Activity, Clock, Dumbbell, Flame, Share2, TrendingUp } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { toDateKey } from "@/constants/workouts";

export default function GlobalRecapScreen() {
  const { state } = useApp();

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

  const share = async () => {
    try {
      await Share.share({
        message: `My last 30 days on OnStreak: ${consistency.done} workouts, ${state.totalReps} reps, ${state.streak} day streak. 🔥`,
      });
    } catch (e) {
      console.log("share", e);
    }
  };

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ title: "30-Day Recap" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={["rgba(255,107,53,0.25)", "transparent"]}
          style={styles.hero}
        />
        <Text style={styles.label}>YOUR LAST 30 DAYS</Text>
        <Text style={styles.title}>You showed up.</Text>
        <Text style={styles.sub}>
          A snapshot of everything you&apos;ve done this month.
        </Text>

        <View style={styles.big}>
          <Text style={styles.bigValue}>{consistency.done}</Text>
          <Text style={styles.bigLabel}>workouts completed</Text>
          <View style={styles.track}>
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${consistency.pct}%` }]}
            />
          </View>
          <Text style={styles.pctText}>
            {consistency.pct}% consistency
          </Text>
        </View>

        <View style={styles.grid}>
          <StatCard
            icon={<Flame color={Colors.primary} size={20} />}
            value={String(state.streak)}
            label="Current streak"
          />
          <StatCard
            icon={<Dumbbell color={Colors.accent} size={20} />}
            value={state.totalReps.toLocaleString()}
            label="Total reps"
          />
          <StatCard
            icon={<Clock color={Colors.accent} size={20} />}
            value={`${state.totalMinutes}m`}
            label="Time spent"
          />
          <StatCard
            icon={<TrendingUp color={Colors.success} size={20} />}
            value={String(state.completedDates.length)}
            label="All-time"
          />
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
            <Share2 color={Colors.text} size={16} />
            <Text style={styles.shareText}>Share my recap</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => router.back()}
        >
          <Activity color={Colors.textMuted} size={16} />
          <Text style={styles.secondaryText}>Keep the streak alive</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 60 },
  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 240,
  },
  label: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 8,
  },
  title: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: 6,
  },
  sub: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 24,
  },
  big: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
  },
  bigValue: {
    color: Colors.text,
    fontSize: 64,
    fontWeight: "900",
    letterSpacing: -2,
  },
  bigLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
  track: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 16,
  },
  fill: { height: "100%", borderRadius: 4 },
  pctText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: { color: Colors.text, fontSize: 22, fontWeight: "800" },
  statLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  shareBtn: { borderRadius: 14, overflow: "hidden" },
  shareGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  shareText: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  secondaryText: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
});
