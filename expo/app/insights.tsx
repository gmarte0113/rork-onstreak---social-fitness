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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  Clock,
  Dumbbell,
  Flame,
  Lock,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { toDateKey } from "@/constants/workouts";
import { supabase, isSupabaseConfigured, PROFILES_TABLE } from "@/lib/supabase";

type Period = 7 | 30 | 365;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export default function InsightsScreen() {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
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

  const calendar = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();
    const firstWeekday = (first.getDay() + 6) % 7;
    const todayKey = toDateKey(today);
    const cells: { day: number | null; key: string | null; done: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ day: null, key: null, done: false, isToday: false });
    }
    let completed = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const cur = new Date(year, month, d);
      const key = toDateKey(cur);
      const done = completedSet.has(key);
      if (done) completed++;
      cells.push({ day: d, key, done, isToday: key === todayKey });
    }
    const consistency = Math.round((completed / daysInMonth) * 100);
    return {
      monthLabel: MONTH_NAMES[month],
      cells,
      completed,
      daysInMonth,
      consistency,
    };
  }, [completedSet]);

  const weeklyBars = useMemo(() => {
    const bars: number[] = new Array(7).fill(0);
    const today = new Date();
    for (let i = 0; i < 28; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = toDateKey(d);
      if (completedSet.has(key)) {
        const idx = (d.getDay() + 6) % 7;
        bars[idx] += 1;
      }
    }
    const max = Math.max(1, ...bars);
    const peak = bars.indexOf(Math.max(...bars));
    return bars.map((v, i) => ({
      count: v,
      pct: Math.round((v / max) * 100),
      isPeak: i === peak && v > 0,
    }));
  }, [completedSet]);

  const insight = useMemo(() => {
    const last7 = periodStatsFor(7, completedSet);
    const prev7Total = periodStatsFor(14, completedSet).completed;
    const prevOnly = prev7Total - last7.completed;
    const delta = prevOnly > 0 ? Math.round(((last7.completed - prevOnly) / prevOnly) * 100) : null;
    if (last7.completed > prevOnly) {
      return {
        title: "More consistent than last week",
        sub: `${last7.completed} of 7 days${delta !== null ? ` · +${delta}% from last week` : ""}`,
      };
    }
    if (last7.completed === prevOnly && last7.completed > 0) {
      return {
        title: "Matching last week",
        sub: `${last7.completed} of 7 days · keep the momentum`,
      };
    }
    return {
      title: "Ease back in",
      sub: `${last7.completed} of 7 days · one workout today counts`,
    };
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

  const totalMinutes = state.totalMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <View style={styles.safe}>
      <Stack.Screen
        options={{
          title: "Your Progress",
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "800" },
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
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
                activeOpacity={0.85}
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
            icon={<Zap color={Colors.primary} size={16} fill={Colors.primary} />}
            label="WORKOUTS"
            value={state.completedDates.length.toLocaleString()}
            hint={period === 365 ? "all time" : `last ${period}d`}
          />
          <StatCard
            icon={<Flame color={Colors.primary} size={16} fill={Colors.primary} />}
            label="CURRENT STREAK"
            value={state.streak.toString()}
            valueSuffix="DAYS"
            valueAccent
            hint={`best ${state.longestStreak}`}
          />
          <StatCard
            icon={<Sparkles color={Colors.primary} size={16} />}
            label="TOTAL REPS"
            value={state.totalReps.toLocaleString()}
            hint="tracked"
          />
          <StatCard
            icon={<Clock color={Colors.primary} size={16} />}
            label="TIME"
            value={`${hours}h`}
            valueSuffix={`${minutes.toString().padStart(2, "0")}M`}
            hint="working out"
          />
        </View>

        <View style={styles.insightCard}>
          <LinearGradient
            colors={["rgba(255,107,53,0.18)", "rgba(255,107,53,0.04)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.insightIcon}>
            <TrendingUp color={Colors.primary} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightText}>{insight.title}</Text>
            <Text style={styles.insightSub}>{insight.sub}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>CALENDAR</Text>
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitleLg}>Consistency</Text>
              <Text style={styles.cardMeta}>
                {calendar.completed} of {calendar.daysInMonth} days · {calendar.monthLabel}
              </Text>
            </View>
            <View style={styles.pctPill}>
              <Text style={styles.pctText}>{calendar.consistency}%</Text>
            </View>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((w, i) => (
              <Text key={`${w}-${i}`} style={styles.weekHeader}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.calGrid}>
            {calendar.cells.map((c, i) => {
              if (c.day === null) {
                return <View key={`e-${i}`} style={styles.calCell} />;
              }
              return (
                <View
                  key={`d-${c.key}`}
                  style={[
                    styles.calCell,
                    styles.calDay,
                    c.done && styles.calDayOn,
                    c.isToday && !c.done && styles.calDayToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.calDayText,
                      c.done && styles.calDayTextOn,
                      !c.done && c.isToday && styles.calDayTextToday,
                    ]}
                  >
                    {c.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionLabel}>BY WEEKDAY</Text>
        <View style={[styles.card, !isPro && styles.cardLockedWrap]}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitleLg}>By weekday</Text>
              <Text style={styles.cardMeta}>last 4 weeks</Text>
            </View>
            {!isPro && (
              <View style={styles.proBadge}>
                <Lock color={Colors.text} size={10} />
                <Text style={styles.proBadgeText}>Pro</Text>
              </View>
            )}
          </View>
          <View style={styles.barRow}>
            {WEEKDAY_LABELS.map((label, i) => {
              const b = weeklyBars[i];
              return (
                <View key={`${label}-${i}`} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${Math.max(6, b.pct)}%` },
                        b.isPeak ? styles.barFillPeak : styles.barFillDim,
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
          {!isPro && <LockedOverlay />}
        </View>

        {programBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>BY PROGRAM</Text>
            <View style={[styles.card, !isPro && styles.cardLockedWrap]}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitleLg}>By program</Text>
                  <Text style={styles.cardMeta}>{programBreakdown.length} active</Text>
                </View>
                {!isPro && (
                  <View style={styles.proBadge}>
                    <Lock color={Colors.text} size={10} />
                    <Text style={styles.proBadgeText}>Pro</Text>
                  </View>
                )}
              </View>
              {programBreakdown.map((p, idx) => (
                <View
                  key={p.id}
                  style={[
                    styles.progRow,
                    idx === 0 && { borderTopWidth: 0, paddingTop: 4 },
                  ]}
                >
                  <View style={styles.progIcon}>
                    <Trophy color={Colors.primary} size={14} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.progName}>{p.id}</Text>
                    <Text style={styles.progVal}>
                      Day {p.completed} · streak {p.streak}
                    </Text>
                  </View>
                </View>
              ))}
              {!isPro && <LockedOverlay />}
            </View>
          </>
        )}

        <View style={styles.topPctCard}>
          <LinearGradient
            colors={["rgba(255,107,53,0.18)", "rgba(255,107,53,0.0)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {streaksQuery.isLoading && isSupabaseConfigured ? (
            <>
              <ActivityIndicator color={Colors.primary} />
              <Text style={[styles.topPctHint, { marginTop: 10 }]}>
                Calculating your rank…
              </Text>
            </>
          ) : topPct === null ? (
            <>
              <Text style={styles.topPctLabel}>YOU&apos;RE</Text>
              <Text style={[styles.topPctValue, { fontSize: 40 }]}>just starting</Text>
              <Text style={styles.topPctHint}>
                Your top % unlocks as more OnStreakers join
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.topPctLabel}>YOU&apos;RE IN THE</Text>
              <Text style={styles.topPctValue}>
                top <Text style={styles.topPctValueAccent}>{topPct}%</Text>
              </Text>
              <Text style={styles.topPctHint}>of OnStreak users this month</Text>
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
  valueSuffix,
  valueAccent,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueSuffix?: string;
  valueAccent?: boolean;
  hint: string;
}) {
  return (
    <View style={styles.statCard}>
      <LinearGradient
        colors={["rgba(255,107,53,0.08)", "rgba(20,20,22,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.statTopRow}>
        <View style={styles.statIcon}>{icon}</View>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, valueAccent && styles.statValueAccent]}>
          {value}
        </Text>
        {valueSuffix ? (
          <Text style={styles.statValueSuffix}>{valueSuffix}</Text>
        ) : null}
      </View>
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
      <LinearGradient
        colors={["rgba(10,10,11,0.4)", "rgba(10,10,11,0.85)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingTop: 8 },
  segment: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  segBtnActive: { backgroundColor: Colors.surfaceElevated },
  segText: { color: Colors.textMuted, fontSize: 13, fontWeight: "700" },
  segTextActive: { color: Colors.text },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    minHeight: 120,
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  statValue: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  statValueAccent: { color: Colors.primary },
  statValueSuffix: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  statHint: {
    color: Colors.textDim,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },

  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.4)",
    overflow: "hidden",
    marginBottom: 22,
  },
  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,53,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  insightText: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  insightSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 10,
  },

  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
    overflow: "hidden",
  },
  cardLockedWrap: { position: "relative" },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 10,
  },
  cardTitleLg: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  cardMeta: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  pctPill: {
    backgroundColor: "rgba(255,107,53,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pctText: { color: Colors.primary, fontSize: 13, fontWeight: "800" },

  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekHeader: {
    flex: 1,
    textAlign: "center",
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: "700",
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  calDay: {
    backgroundColor: "transparent",
  },
  calDayOn: {},
  calDayToday: {},
  calDayText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    width: "100%",
    height: "100%",
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    lineHeight: 38,
    overflow: "hidden",
  },
  calDayTextOn: {
    backgroundColor: Colors.primary,
    color: Colors.text,
    fontWeight: "800",
  },
  calDayTextToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    color: Colors.text,
  },

  barRow: {
    flexDirection: "row",
    height: 130,
    alignItems: "flex-end",
    gap: 6,
    paddingHorizontal: 4,
  },
  barCol: { flex: 1, alignItems: "center", gap: 8 },
  barTrack: {
    height: 100,
    width: "78%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
  },
  barFillPeak: { backgroundColor: Colors.primary },
  barFillDim: { backgroundColor: "rgba(255,107,53,0.18)" },
  barLabel: { color: Colors.textDim, fontSize: 10, fontWeight: "700" },

  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  proBadgeText: { color: Colors.text, fontSize: 11, fontWeight: "800" },

  progRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  progIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  progName: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  progVal: { color: Colors.textMuted, fontSize: 12, fontWeight: "600", marginTop: 2 },

  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  topPctCard: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 16,
    overflow: "hidden",
  },
  topPctLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  topPctValue: {
    color: Colors.text,
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
    marginTop: 6,
  },
  topPctValueAccent: { color: Colors.primary },
  topPctHint: { color: Colors.textMuted, fontSize: 13, marginTop: 6, fontWeight: "600" },

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
