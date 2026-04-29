import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  ArrowRight,
  Check,
  Clock,
  Flame,
  Lock,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { Colors } from "@/constants/colors";
import { ScreenHeader } from "@/components/ScreenHeader";
import { estimateWorkoutReps, useApp } from "@/providers/AppProvider";
import { maybeRequestFirstWorkoutReview } from "@/lib/review";
import {
  FOCUS_LABELS,
  PLAN_DURATION_DAYS,
} from "@/constants/personalizedPlan";
import WorkoutTimer from "@/components/WorkoutTimer";
import { track } from "@/utils/analytics";

export default function PlanScreen() {
  const {
    state,
    personalizedPlanDays,
    personalizedPlanName,
    completePersonalizedPlanDay,
    exitPersonalizedPlan,
    restartPersonalizedPlan,
    resumePlanEnrollment,
    isInAnyGroup,
  } = useApp();
  const isActive = state.activeEnrollment?.kind === "plan";
  const [timerDone, setTimerDone] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  const plan = state.personalizedPlan;

  const currentDay = plan ? Math.min(plan.currentDay, PLAN_DURATION_DAYS) : 1;
  const completedDays = plan?.completedDays ?? [];
  const completedCount = completedDays.length;
  const pct = Math.round((completedCount / PLAN_DURATION_DAYS) * 100);
  const todayEntry = personalizedPlanDays.find((d) => d.day === currentDay);
  const todayKey = new Date().toISOString().slice(0, 10);
  const completedOnCalendarToday = plan?.lastCompletedDate === todayKey;
  const todayDone = completedDays.includes(currentDay) || completedOnCalendarToday;
  const completedToday = state.completedDates.includes(todayKey);
  const waitUntilTomorrow =
    isActive &&
    !completedDays.includes(currentDay) &&
    !completedOnCalendarToday &&
    completedToday;

  useEffect(() => {
    if (todayDone) setTimerDone(true);
  }, [todayDone]);

  useEffect(() => {
    if (plan && !todayDone) {
      track("workout_started", { plan: "personalized", day: currentDay });
    }
  }, [plan, todayDone, currentDay]);

  useEffect(() => {
    if (!plan) {
      router.replace("/plan/setup");
    }
  }, [plan]);

  if (!plan) {
    return (
      <View style={styles.safe}>
        <ScreenHeader />
        <View style={[styles.emptyWrap, { paddingTop: insets.top + 56 }]}>
          <Text style={styles.emptyTitle}>No plan yet</Text>
          <Text style={styles.emptySub}>
            Start a personalized plan tailored to your focus areas.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/plan/setup")}
            activeOpacity={0.85}
            style={styles.ctaWrap}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Build my plan</Text>
              <ArrowRight color={Colors.text} size={20} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const onComplete = async () => {
    if (todayDone || !todayEntry) return;
    if (!isActive) {
      resumePlanEnrollment();
      return;
    }
    if (waitUntilTomorrow) return;
    if (!timerDone) return;
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (isInAnyGroup()) {
      router.push({
        pathname: "/workout-photo",
        params: { source: "plan", day: String(currentDay) },
      });
      return;
    }
    completePersonalizedPlanDay(currentDay, {
      reps: estimateWorkoutReps(todayEntry.exercises),
      minutes: todayEntry.durationMinutes,
    });
    setTimeout(() => {
      maybeRequestFirstWorkoutReview().catch(() => {});
    }, 600);
  };

  const onExit = () => {
    if (Platform.OS === "web") {
      exitPersonalizedPlan();
      router.replace("/plan/setup");
      return;
    }
    Alert.alert(
      "Exit this plan?",
      "Your progress will be cleared. You can create a new plan anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Exit",
          style: "destructive",
          onPress: () => {
            exitPersonalizedPlan();
            router.replace("/plan/setup");
          },
        },
      ]
    );
  };

  const onRestart = () => {
    if (Platform.OS === "web") {
      restartPersonalizedPlan();
      return;
    }
    Alert.alert("Restart from Day 1?", "Your current progress will reset.", [
      { text: "Cancel", style: "cancel" },
      { text: "Restart", onPress: restartPersonalizedPlan },
    ]);
  };

  return (
    <View style={styles.safe}>
      <ScreenHeader
        right={
          <TouchableOpacity
            onPress={onRestart}
            hitSlop={10}
            style={styles.headerActionBtn}
            testID="plan-restart"
          >
            <RotateCcw color={Colors.text} size={16} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 56 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["rgba(255,107,53,0.15)", "transparent"]}
          style={styles.heroBg}
        />

        <View style={styles.header}>
          <View style={styles.focusChips}>
            {plan.focusAreas.map((f) => (
              <View key={f} style={styles.focusChip}>
                <Text style={styles.focusChipText}>{FOCUS_LABELS[f]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.title}>{personalizedPlanName}</Text>
          <Text style={styles.subtitle}>
            Day {currentDay} of {PLAN_DURATION_DAYS} · tailored for you
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressValue}>
                {completedCount}/{PLAN_DURATION_DAYS} days
              </Text>
            </View>
            <View style={styles.streakPill}>
              <Flame color={Colors.primary} size={14} fill={Colors.primary} />
              <Text style={styles.streakPillText}>{state.streak}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[Colors.primary, Colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${pct}%` }]}
            />
          </View>
          <Text style={styles.progressMeta}>
            {PLAN_DURATION_DAYS - completedCount} days to go
          </Text>
        </View>

        {todayEntry && (
          <View style={styles.todayCard}>
            <View style={styles.todayTopRow}>
              <Text style={styles.todayLabel}>TODAY · DAY {currentDay}</Text>
              <View style={styles.timePill}>
                <Clock color={Colors.textMuted} size={12} />
                <Text style={styles.timeText}>
                  {todayEntry.durationMinutes} min
                </Text>
              </View>
            </View>
            <Text style={styles.todayTitle}>{todayEntry.title}</Text>
            {!isActive && (
              <TouchableOpacity
                onPress={resumePlanEnrollment}
                activeOpacity={0.85}
                style={styles.resumeBadge}
                testID="plan-resume"
              >
                <Text style={styles.resumeText}>Paused · Tap to resume</Text>
              </TouchableOpacity>
            )}
            <View style={styles.focusTagRow}>
              <Text style={styles.focusTag}>
                {FOCUS_LABELS[todayEntry.focus]}
              </Text>
            </View>
            <View style={styles.exerciseList}>
              {todayEntry.exercises.map((ex, i) => (
                <View key={`${ex.name}-${i}`} style={styles.exerciseRow}>
                  <View style={styles.exerciseDot} />
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseReps}>{ex.reps}</Text>
                </View>
              ))}
            </View>
            {isActive && !todayDone && !waitUntilTomorrow && (
              <WorkoutTimer
                exercises={todayEntry.exercises}
                onDone={() => setTimerDone(true)}
                testID="plan-workout-timer"
              />
            )}
            <TouchableOpacity
              onPress={onComplete}
              disabled={todayDone || waitUntilTomorrow || (isActive && !timerDone)}
              activeOpacity={0.85}
              style={styles.ctaWrap}
              testID="plan-complete-btn"
            >
              <LinearGradient
                colors={
                  todayDone || waitUntilTomorrow || (isActive && !timerDone)
                    ? [Colors.surfaceElevated, Colors.surfaceElevated]
                    : [Colors.primary, Colors.primaryDark]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                {waitUntilTomorrow ? (
                  <>
                    <Check color={Colors.accent} size={20} />
                    <Text style={[styles.ctaText, { color: Colors.accent }]}>
                      Come back tomorrow
                    </Text>
                  </>
                ) : isActive && !timerDone && !todayDone ? (
                  <Text style={[styles.ctaText, { color: Colors.textMuted }]}>
                    Finish the timer to complete
                  </Text>
                ) : todayDone ? (
                  <>
                    <Check color={Colors.success} size={20} />
                    <Text
                      style={[styles.ctaText, { color: Colors.success }]}
                    >
                      {completedOnCalendarToday && !completedDays.includes(currentDay)
                        ? "Come back tomorrow"
                        : "Day Completed"}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.ctaText}>Complete Workout</Text>
                    <ArrowRight color={Colors.text} size={20} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.timelineTitle}>UPCOMING</Text>
        {personalizedPlanDays
          .filter((d) => d.day >= currentDay)
          .slice(0, 14)
          .map((d) => (
            <TimelineRow
              key={d.day}
              day={d.day}
              title={d.title}
              focus={FOCUS_LABELS[d.focus]}
              duration={d.durationMinutes}
              state={
                completedDays.includes(d.day)
                  ? "done"
                  : d.day === currentDay
                  ? "current"
                  : !state.isPremium
                  ? "locked"
                  : "future"
              }
              reps={d.exercises.map((e) => `${e.name} · ${e.reps}`).join(", ")}
              onLockedPress={() => router.push("/paywall")}
            />
          ))}

        <TouchableOpacity
          onPress={onExit}
          style={styles.exitBtn}
          activeOpacity={0.85}
          testID="plan-exit"
        >
          <Trash2 color={Colors.danger} size={14} />
          <Text style={styles.exitText}>Exit plan</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function TimelineRow({
  day,
  title,
  focus,
  duration,
  state,
  reps,
  onLockedPress,
}: {
  day: number;
  title: string;
  focus: string;
  duration: number;
  state: "done" | "current" | "future" | "locked";
  reps: string;
  onLockedPress?: () => void;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const isCurrent = state === "current";
  const isDone = state === "done";
  const isLocked = state === "locked";
  return (
    <TouchableOpacity
      onPress={() => (isLocked ? onLockedPress?.() : setOpen((v) => !v))}
      activeOpacity={0.85}
      style={[
        styles.dayRow,
        isCurrent && {
          borderColor: Colors.primary,
          backgroundColor: Colors.surface,
        },
      ]}
    >
      <View style={styles.dayMain}>
        <View
          style={[
            styles.dayBadge,
            isDone && { backgroundColor: Colors.primary },
            isCurrent && { borderColor: Colors.primary, borderWidth: 2 },
          ]}
        >
          {isDone ? (
            <Check color={Colors.bg} size={14} strokeWidth={3} />
          ) : isLocked ? (
            <Lock color={Colors.textMuted} size={12} />
          ) : (
            <Text
              style={[
                styles.dayNum,
                isCurrent && { color: Colors.primary },
              ]}
            >
              {day}
            </Text>
          )}
        </View>
        <View style={{ flex: 1, overflow: "hidden" }}>
          <Text
            style={[
              styles.dayTitle,
              isDone && { color: Colors.textMuted },
              isLocked && { color: Colors.textDim },
            ]}
            numberOfLines={1}
          >
            Day {day}{isLocked ? "" : ` · ${title}`}
          </Text>
          {isLocked ? (
            <View style={styles.lockedMetaWrap}>
              <Text
                style={[styles.dayMeta, Platform.OS === "web" && { color: "transparent", textShadowColor: "rgba(255,255,255,0.4)", textShadowRadius: 5 }]}
                numberOfLines={1}
              >
                {focus} · {duration} min
              </Text>
              {Platform.OS !== "web" && (
                <BlurView
                  intensity={18}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              )}
            </View>
          ) : (
            <Text style={styles.dayMeta} numberOfLines={1}>
              {focus} · {duration} min
            </Text>
          )}
        </View>
        {isLocked && (
          <View style={styles.lockPill}>
            <Lock color={Colors.textMuted} size={12} />
          </View>
        )}
      </View>
      {open && !isLocked && <Text style={styles.dayReps}>{reps}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 80 },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: { padding: 40, gap: 14, alignItems: "center" },
  emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: "800" },
  emptySub: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  header: { marginBottom: 20 },
  focusChips: { flexDirection: "row", gap: 6, marginBottom: 12 },
  focusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,107,53,0.15)",
  },
  focusChipText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  progressLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  progressValue: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,107,53,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  streakPillText: { color: Colors.primary, fontSize: 12, fontWeight: "800" },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  progressMeta: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 10,
    fontWeight: "600",
  },
  todayCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  todayTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  todayLabel: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  timeText: { color: Colors.textMuted, fontSize: 11, fontWeight: "600" },
  todayTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
  focusTagRow: { flexDirection: "row", marginTop: 4, marginBottom: 14 },
  focusTag: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  exerciseList: { gap: 10, marginBottom: 16 },
  exerciseRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  exerciseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  exerciseName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  exerciseReps: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
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
  timelineTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: "column",
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  dayMain: { flexDirection: "row", alignItems: "center", gap: 12 },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: { color: Colors.textMuted, fontSize: 12, fontWeight: "800" },
  dayTitle: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  dayMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  dayReps: {
    color: Colors.textMuted,
    fontSize: 12,
    paddingLeft: 44,
    lineHeight: 18,
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 10,
  },
  exitText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  resumeBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,182,39,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,182,39,0.3)",
  },
  resumeText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  lockedMetaWrap: {
    marginTop: 2,
    overflow: "hidden",
    borderRadius: 4,
    alignSelf: "stretch",
  },
  lockPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
});
