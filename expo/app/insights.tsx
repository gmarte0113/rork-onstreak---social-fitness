import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowRight,
  BarChart3,
  Clock,
  Dumbbell,
  Flame,
  Lock,
  Percent,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { toDateKey } from "@/constants/workouts";
import { supabase, isSupabaseConfigured, PROFILES_TABLE } from "@/lib/supabase";

type Period = 7 | 30 | 365;

export default function InsightsScreen() {
  const { state } = useApp();
  const [period, setPeriod] = React.useState<Period>(30);
  const isPro = state.isPremium;

  const completedSet = useMemo(
    () => new Set(state.completedDates),
    [state.completedDates]
  );

  const periodStats = useMemo(() => {
    const days: { key: string; done: boolean }[] = [];
    const today = new Date();
    if (period === 30) {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      for (let d = 1; d <= last.getDate(); d++) {
        const cur = new Date(first.getFullYear(), first.getMonth(), d);
        const key = toDateKey(cur);
        days.push({ key, done: completedSet.has(key) });
      }
    } else {
      const n = period === 365 ? (state.completedDates.length > 0 ? 365 : 30) : period;
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = toDateKey(d);
        days.push({ key, done: completedSet.has(key) });
      }
    }
    const completed = days.filter((d) => d.done).length;
    const consistency = Math.round((completed / Math.max(1, days.length)) * 100);
    return { days, completed, consistency };
  }, [period, completedSet, state.completedDates.length]);

  const weeklyBars = useMemo(() => {
    const bars: number[] = new Array(7).fill(0);
    const today = new Date();
    for (let i = 0; i < 28; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toDateKey(d);
      if (completedSet.has(key)) {
        bars[d.getDay()] += 1;
      }
    }
    const max = Math.max(1, ...bars);
    return bars.map((v) => ({ count: v, pct: Math.round((v / max) * 100) }));
  }, [completedSet]);

  const insight = useMemo(() => {
    const last7 = periodStatsFor(7, completedSet);
    const prev7 = periodStatsFor(14, completedSet);
    const prev = prev7.completed - last7.completed;
    if (last7.completed > prev) return "You're more consistent than last week";
    if (last7.completed === prev && last7.completed > 0)
      return "Matching last week — keep the momentum";
    return "Ease back in — one workout today counts";
  }, [completedSet]);

  const streaksQuery = useQuery<number[]>({
    queryKey: ["leaderboard-streaks"],
    enabled: isSupabaseConfigured,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .select("streak")
        .limit(5000);
      if (error) {
        console.log("[insights] streaks query error", error.message);
        return [];
      }
      return (data ?? [])
        .map((r) => Number((r as { streak: number | null }).streak ?? 0))
        .filter((n) => Number.isFinite(n));
    },
  });

  const topPct = useMemo<number | null>(() => {
    const all = streaksQuery.data ?? [];
    const mine = state.streak;
    if (all.length < 5) return null;
    const better = all.filter((s) => s > mine).length;
    const raw = Math.round((better / all.length) * 100);
    if (mine <= 0) return Math.max(raw, 90);
    return Math.max(1, Math.min(99, raw));
  }, [streaksQuery.data, state.streak]);

  const programBreakdown = useMemo(() => {
    return Object.entries(state.programs).map(([id, p]) => ({
      id,
      completed: p.completedDays.length,
      streak: p.streak,
    }));
  }, [state.programs]);

  return (
    <View style={styles.safe}>
      <Stack.Screen
        options={{
          title: "Insights",
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.text,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <BarChart3 color={Colors.accent} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Your progress</Text>
            <Text style={styles.subtitle}>
              {isPro ? "Deep analytics unlocked" : "Preview — Pro shows everything"}
            </Text>
          </View>
        </View>

        <View style={styles.segment}>
          {[
            { id: 7, label: "7d" },
            { id: 30, label: "30d" },
            { id: 365, label: "All" },
          ].map((p) => {
            const active = period === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.segBtn, active && styles.segBtnActive]}
                onPress={() => setPeriod(p.id as Period)}
                testID={`period-${p.id}`}
              >
                <Text
                  style={[styles.segText, active && styles.segTextActive]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon={<Dumbbell color={Colors.primary} size={18} />}
            label="Workouts"
            value={state.completedDates.length.toString()}
            hint="all time"
          />
          <StatCard
            icon={<Flame color={Colors.primary} size={18} fill={Colors.primary} />}
            label="Current streak"
            value={state.streak.toString()}
            hint={`best ${state.longestStreak}`}
          />
          <StatCard
            icon={<Sparkles color={Colors.accent} size={18} />}
            label="Total reps"
            value={state.totalReps.toLocaleString()}
            hint="tracked"
          />
          <StatCard
            icon={<Clock color={Colors.accent} size={18} />}
            label="Time"
            value={`${state.totalMinutes}m`}
            hint="working out"
          />
        </View>

        <View style={styles.insightCard}>
          <LinearGradient
            colors={["rgba(255,107,53,0.2)", "rgba(255,182,39,0.08)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <TrendingUp color={Colors.accent} size={20} />
          <Text style={styles.insightText}>{insight}</Text>
        </View>

        <View style={[styles.card, !isPro && styles.cardLockedWrap]}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Consistency</Text>
            <View style={styles.pctPill}>
              <Percent color={Colors.primary} size={12} />
              <Text style={styles.pctText}>{periodStats.consistency}%</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>
            {periodStats.completed} of {periodStats.days.length} days completed
          </Text>
          <View style={styles.dotGrid}>
            {periodStats.days.map((d, i) => (
              <View
                key={`${d.key}-${i}`}
                style={[styles.dot, d.done && styles.dotOn]}
              />
            ))}
          </View>
        </View>

        <View style={[styles.card, !isPro && styles.cardLockedWrap]}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>By weekday</Text>
            <Text style={styles.cardHint}>last 4 weeks</Text>
          </View>
          <View style={styles.barRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => (
              <View key={`${label}-${i}`} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${weeklyBars[i].pct}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{label}</Text>
                <Text style={styles.barCount}>{weeklyBars[i].count}</Text>
              </View>
            ))}
          </View>
          {!isPro && <LockedOverlay />}
        </View>

        {programBreakdown.length > 0 && (
          <View style={[styles.card, !isPro && styles.cardLockedWrap]}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>By program</Text>
              <Trophy color={Colors.accent} size={14} />
            </View>
            {programBreakdown.map((p) => (
              <View key={p.id} style={styles.progRow}>
                <Text style={styles.progName}>{p.id}</Text>
                <Text style={styles.progVal}>
                  {p.completed} days · streak {p.streak}
                </Text>
              </View>
            ))}
            {!isPro && <LockedOverlay />}
          </View>
        )}

        <View style={styles.topPctCard}>
          {streaksQuery.isLoading && isSupabaseConfigured ? (
            <>
              <ActivityIndicator color={Colors.primary} />
              <Text style={[styles.topPctHint, { marginTop: 10 }]}>
                Calculating your rank…
              </Text>
            </>
          ) : topPct === null ? (
            <>
              <Text style={styles.topPctLabel}>Leaderboard</Text>
              <Text style={[styles.topPctValue, { fontSize: 22 }]}>
                Just getting started
              </Text>
              <Text style={styles.topPctHint}>
                Your top % unlocks as more OnStreakers join
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.topPctLabel}>You&apos;re in the</Text>
              <Text style={styles.topPctValue}>top {topPct}%</Text>
            </>
          )}
        </View>

        {!isPro && (
          <TouchableOpacity
            style={styles.upgrade}
            onPress={() => router.push("/paywall")}
            activeOpacity={0.9}
            testID="insights-upgrade"
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.upgradeInner}
            >
              <Sparkles color={Colors.text} size={18} />
              <Text style={styles.upgradeText}>
                Unlock full analytics with Pro
              </Text>
              <ArrowRight color={Colors.text} size={18} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function periodStatsFor(days: number, completedSet: Set<string>) {
  const today = new Date();
  let completed = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (completedSet.has(toDateKey(d))) completed++;
  }
  return { completed };
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

function LockedOverlay() {
  return (
    <TouchableOpacity
      style={styles.lockedOverlay}
      onPress={() => router.push("/paywall")}
      activeOpacity={0.9}
    >
      <View style={styles.lockedChip}>
        <Lock color={Colors.text} size={12} />
        <Text style={styles.lockedChipText}>Pro only</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 80 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,182,39,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 18,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  segBtnActive: { backgroundColor: Colors.surface },
  segText: { color: Colors.textMuted, fontSize: 13, fontWeight: "800" },
  segTextActive: { color: Colors.text },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    width: "48%",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "700" },
  statValue: { color: Colors.text, fontSize: 22, fontWeight: "800" },
  statHint: { color: Colors.textDim, fontSize: 11, fontWeight: "600" },
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    marginBottom: 14,
  },
  insightText: { color: Colors.text, fontSize: 14, fontWeight: "700", flex: 1 },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    overflow: "hidden",
  },
  cardLockedWrap: { position: "relative" },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitle: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  cardHint: { color: Colors.textDim, fontSize: 11, fontWeight: "700" },
  cardMeta: { color: Colors.textMuted, fontSize: 12, marginBottom: 12 },
  pctPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,107,53,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pctText: { color: Colors.primary, fontSize: 12, fontWeight: "800" },
  dotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: Colors.surfaceElevated,
  },
  dotOn: { backgroundColor: Colors.primary },
  barRow: {
    flexDirection: "row",
    height: 110,
    alignItems: "flex-end",
    gap: 6,
  },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barTrack: {
    height: 80,
    width: "70%",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  barLabel: { color: Colors.textDim, fontSize: 10, fontWeight: "700" },
  barCount: { color: Colors.textMuted, fontSize: 10, fontWeight: "800" },
  progRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  progName: { color: Colors.text, fontSize: 13, fontWeight: "700" },
  progVal: { color: Colors.textMuted, fontSize: 12, fontWeight: "600" },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,11,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  lockedChipText: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  topPctCard: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  topPctLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: "700" },
  topPctValue: {
    color: Colors.primary,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: 4,
  },
  topPctHint: { color: Colors.textDim, fontSize: 12, marginTop: 4 },
  upgrade: { borderRadius: 16, overflow: "hidden" },
  upgradeInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  upgradeText: { color: Colors.text, fontSize: 15, fontWeight: "800" },
});
