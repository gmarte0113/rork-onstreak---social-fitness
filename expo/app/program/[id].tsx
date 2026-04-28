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
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowRight,
  Check,
  Flame,
  Footprints,
  Lock,
  Sparkles,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { estimateWorkoutReps, useApp } from "@/providers/AppProvider";
import { getProgram } from "@/constants/programs";
import { maybeRequestFirstWorkoutReview } from "@/lib/review";
import WorkoutTimer from "@/components/WorkoutTimer";
import { track } from "@/utils/analytics";

export default function ProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, completeProgramDay, isInAnyGroup, enrollInProgram } = useApp();
  const program = useMemo(() => getProgram(id ?? ""), [id]);
  const [timerDone, setTimerDone] = useState<boolean>(false);

  if (!program) {
    return (
      <View style={styles.safe}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={styles.missing}>Program not found.</Text>
      </View>
    );
  }

  const isPremium = state.isPremium;
  const progress = state.programs[program.id];
  const completedDays = progress?.completedDays ?? [];
  const currentDay = Math.min(
    progress?.currentDay ?? 1,
    program.durationDays
  );
  const completedCount = completedDays.length;
  const pct = Math.round((completedCount / program.durationDays) * 100);
  const programStreak = progress?.streak ?? 0;

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayEntry = program.days.find((d) => d.day === currentDay);
  const fullyLocked = program.premium && !isPremium;
  const todayLocked = fullyLocked;
  const completedOnCalendarToday = progress?.lastCompletedDate === todayKey;
  const todayDone =
    completedDays.includes(currentDay) || completedOnCalendarToday;

  const enrollment = state.activeEnrollment;
  const isActive =
    enrollment?.kind === "program" && enrollment.programId === program.id;
  const hasOtherEnrollment =
    (enrollment?.kind === "plan") ||
    (enrollment?.kind === "program" && enrollment.programId !== program.id);

  const otherProgram =
    enrollment?.kind === "program" && enrollment.programId !== program.id
      ? getProgram(enrollment.programId)
      : null;
  const otherEnrollmentLabel =
    enrollment?.kind === "plan"
      ? "your Personalized Plan"
      : otherProgram
      ? otherProgram.title
      : "your current program";

  const completedToday = state.completedDates.includes(todayKey);
  const waitUntilTomorrow =
    isActive &&
    !completedDays.includes(currentDay) &&
    !completedOnCalendarToday &&
    completedToday;

  const performEnroll = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    enrollInProgram(program.id);
  };

  const onEnroll = () => {
    if (fullyLocked) {
      router.push("/paywall");
      return;
    }
    if (!hasOtherEnrollment) {
      performEnroll();
      return;
    }
    if (Platform.OS === "web") {
      performEnroll();
      return;
    }
    Alert.alert(
      "Switch program?",
      `${otherEnrollmentLabel} will be paused. Your daily task will come from ${program.title} from now on.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Switch", style: "destructive", onPress: performEnroll },
      ]
    );
  };

  useEffect(() => {
    if (todayDone) setTimerDone(true);
  }, [todayDone]);

  useEffect(() => {
    if (program && isActive && !todayDone && !todayLocked) {
      track("workout_started", {
        plan: "program",
        program_id: program.id,
        day: currentDay,
      });
    }
  }, [program, isActive, todayDone, todayLocked, currentDay]);

  const onComplete = async () => {
    if (todayLocked || todayDone || !todayEntry) return;
    if (!isActive) return;
    if (completedToday) return;
    if (!timerDone) return;
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (isInAnyGroup()) {
      router.push({
        pathname: "/workout-photo",
        params: {
          source: "program",
          programId: program.id,
          day: String(currentDay),
        },
      });
      return;
    }
    completeProgramDay(program.id, currentDay, {
      reps: estimateWorkoutReps(todayEntry.exercises),
      minutes: todayEntry.durationMinutes,
    });
    setTimeout(() => {
      maybeRequestFirstWorkoutReview().catch(() => {});
    }, 600);
    if (completedDays.length + 1 >= program.durationDays) {
      router.push({ pathname: "/recap/[id]", params: { id: program.id } });
    }
  };

  return (
    <View style={styles.safe}>
      <Stack.Screen
        options={{
          title: program.title,
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.text,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[program.accentBg, "transparent"]}
          style={styles.heroBg}
        />

        <View style={styles.header}>
          <View style={styles.tagRow}>
            <View
              style={[
                styles.tag,
                { backgroundColor: program.accentBg },
              ]}
            >
              <Text style={[styles.tagText, { color: program.accent }]}>
                {program.durationDays} DAYS
              </Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagTextMuted}>{program.difficulty}</Text>
            </View>
          </View>
          <Text style={styles.title}>{program.title}</Text>
          <Text style={styles.subtitle}>{program.subtitle}</Text>
          <Text style={styles.description}>{program.description}</Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressValue}>
                Day {Math.min(currentDay, program.durationDays)} of{" "}
                {program.durationDays}
              </Text>
            </View>
            <View style={styles.streakPill}>
              <Flame color={Colors.primary} size={14} fill={Colors.primary} />
              <Text style={styles.streakPillText}>{programStreak}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[program.accent, Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${pct}%` }]}
            />
          </View>
          <Text style={styles.progressMeta}>
            {completedCount} completed · {program.durationDays - completedCount}{" "}
            to go
          </Text>
        </View>

        {todayEntry && !fullyLocked && (
          <View style={styles.todayCard}>
            <Text style={styles.todayLabel}>TODAY · DAY {currentDay}</Text>
            {!isActive && (
              <View style={styles.notActiveBadge}>
                <Text style={styles.notActiveText}>
                  {hasOtherEnrollment
                    ? `Paused · ${otherEnrollmentLabel} is active`
                    : "Not enrolled yet"}
                </Text>
              </View>
            )}
            <Text style={styles.todayTitle}>{todayEntry.title}</Text>
            <View style={styles.exerciseList}>
              {todayEntry.exercises.map((ex, i) => (
                <View key={`${ex.name}-${i}`} style={styles.exerciseRow}>
                  <View
                    style={[
                      styles.exerciseDot,
                      { backgroundColor: program.accent },
                    ]}
                  />
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseReps}>{ex.reps}</Text>
                </View>
              ))}
              {todayEntry.stepGoal && (
                <View style={styles.exerciseRow}>
                  <Footprints color={Colors.accent} size={14} />
                  <Text style={styles.exerciseName}>Daily steps</Text>
                  <Text style={styles.exerciseReps}>
                    {todayEntry.stepGoal.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
            {isActive && !todayDone && !waitUntilTomorrow && (
              <WorkoutTimer
                exercises={todayEntry.exercises}
                onDone={() => setTimerDone(true)}
                testID="program-workout-timer"
              />
            )}
            {isActive ? (
              <TouchableOpacity
                onPress={onComplete}
                disabled={todayDone || waitUntilTomorrow || !timerDone}
                activeOpacity={0.85}
                style={styles.ctaWrap}
                testID="program-complete-btn"
              >
                <LinearGradient
                  colors={
                    todayDone || waitUntilTomorrow || !timerDone
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
                  ) : !timerDone && !todayDone ? (
                    <Text style={[styles.ctaText, { color: Colors.textMuted }]}>
                      Finish the timer to complete
                    </Text>
                  ) : todayDone ? (
                    <>
                      <Check color={Colors.success} size={20} />
                      <Text
                        style={[styles.ctaText, { color: Colors.success }]}
                      >
                        {completedOnCalendarToday &&
                        !completedDays.includes(currentDay)
                          ? "Come back tomorrow"
                          : "Day Completed"}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.ctaText}>Complete Day {currentDay}</Text>
                      <ArrowRight color={Colors.text} size={20} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onEnroll}
                activeOpacity={0.85}
                style={styles.ctaWrap}
                testID="program-enroll-btn"
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cta}
                >
                  <Sparkles color={Colors.text} size={18} />
                  <Text style={styles.ctaText}>
                    {hasOtherEnrollment ? "Switch to this program" : "Enroll"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {fullyLocked && (
          <View style={styles.lockedCard}>
            <View style={[styles.lockBig, { alignSelf: "center" }]}>
              <Lock color={Colors.accent} size={22} />
            </View>
            <Text style={[styles.lockedTitle, styles.lockedCenter]}>
              Upgrade to Pro
            </Text>
            <Text style={styles.lockedSub}>
              {program.title} is a Pro {program.type === "challenge" ? "challenge" : "plan"}.
              Unlock {program.durationDays} days of structured workouts and keep your streak alive.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/paywall")}
              style={styles.ctaWrap}
              activeOpacity={0.85}
              testID="paywall-cta"
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
        )}

        <Text style={styles.timelineTitle}>PROGRAM TIMELINE</Text>

        {program.weeklyGrouping
          ? renderWeeklyTimeline(
              program.days,
              completedDays,
              currentDay,
              fullyLocked ? 0 : isPremium ? Infinity : currentDay,
              program.accent
            )
          : program.days.map((d) => (
              <DayRow
                key={d.day}
                day={d.day}
                title={d.title}
                reps={d.exercises.map((e) => `${e.name} · ${e.reps}`).join(", ")}
                state={
                  completedDays.includes(d.day)
                    ? "done"
                    : d.day === currentDay
                    ? "current"
                    : fullyLocked || (!isPremium && d.day > currentDay)
                    ? "locked"
                    : "future"
                }
                accent={program.accent}
              />
            ))}
      </ScrollView>
    </View>
  );
}

function renderWeeklyTimeline(
  days: { day: number; title: string; exercises: { name: string; reps: string }[] }[],
  completedDays: number[],
  currentDay: number,
  freeLimit: number,
  accent: string
) {
  const weeks: Array<typeof days> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks.map((week, idx) => (
    <View key={idx} style={{ marginBottom: 20 }}>
      <Text style={styles.weekLabel}>Week {idx + 1}</Text>
      {week.map((d) => (
        <DayRow
          key={d.day}
          day={d.day}
          title={d.title}
          reps={d.exercises.map((e) => `${e.name} · ${e.reps}`).join(", ")}
          state={
            completedDays.includes(d.day)
              ? "done"
              : d.day === currentDay
              ? "current"
              : d.day > freeLimit
              ? "locked"
              : "future"
          }
          accent={accent}
        />
      ))}
    </View>
  ));
}

function DayRow({
  day,
  title,
  reps,
  state,
  accent,
}: {
  day: number;
  title: string;
  reps: string;
  state: "done" | "current" | "future" | "locked";
  accent: string;
}) {
  const isLocked = state === "locked";
  const isCurrent = state === "current";
  const isDone = state === "done";

  return (
    <View
      style={[
        styles.dayRow,
        isCurrent && { borderColor: accent, backgroundColor: Colors.surface },
      ]}
    >
      <View
        style={[
          styles.dayBadge,
          isDone && { backgroundColor: accent },
          isCurrent && { borderColor: accent, borderWidth: 2 },
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
              isCurrent && { color: accent },
            ]}
          >
            {day}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
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
          <View style={styles.lockedRepsWrap}>
            <Text
              style={[styles.dayReps, styles.blurredText]}
              numberOfLines={1}
            >
              {reps}
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
          <Text style={styles.dayReps} numberOfLines={1}>
            {reps}
          </Text>
        )}
      </View>
      {isLocked && (
        <View style={styles.lockPill}>
          <Lock color={Colors.textMuted} size={12} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 80 },
  missing: { color: Colors.textMuted, padding: 40, textAlign: "center" },
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  header: { marginBottom: 20 },
  tagRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.surfaceElevated,
  },
  tagText: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  tagTextMuted: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  description: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
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
  todayLabel: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  todayTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 14,
  },
  exerciseList: { gap: 10, marginBottom: 16 },
  exerciseRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  exerciseDot: { width: 6, height: 6, borderRadius: 3 },
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
  lockedCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
    alignItems: "stretch",
  },
  lockedCenter: { alignItems: "center" },
  lockBig: {
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
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  lockedSub: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
  },
  timelineTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  weekLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 4,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    overflow: "hidden",
  },
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
  dayReps: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  lockedRepsWrap: {
    marginTop: 2,
    overflow: "hidden",
    borderRadius: 4,
    alignSelf: "stretch",
    maxWidth: "100%",
  },
  blurredText: Platform.select({
    web: {
      color: "transparent",
      textShadowColor: "rgba(255,255,255,0.45)",
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 5,
    },
    default: { color: Colors.textDim },
  }) as object,
  lockPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  notActiveBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,182,39,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,182,39,0.3)",
  },
  notActiveText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
