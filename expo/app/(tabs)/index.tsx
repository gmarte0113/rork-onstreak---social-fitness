import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Flame,
  Clock,
  Check,
  Settings,
  ArrowRight,
  Info,
  Shield,
  Target,
  Sparkles,
  Trophy,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp, estimateWorkoutReps } from "@/providers/AppProvider";
import { getExerciseDescription } from "@/constants/workouts";
import { maybeRequestFirstWorkoutReview } from "@/lib/review";
import WorkoutTimer from "@/components/WorkoutTimer";
import { FOCUS_LABELS, PLAN_DURATION_DAYS } from "@/constants/personalizedPlan";
import { getProgram } from "@/constants/programs";

function useCountdownToMidnight(active: boolean): string {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(iv);
  }, [active]);
  const nextMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(24, 0, 0, 0);
    return d.getTime();
  }, [now]);
  const diff = Math.max(0, nextMidnight - now);
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export default function HomeScreen() {
  const [timerDone, setTimerDone] = useState<boolean>(false);
  const {
    state,
    completedToday,
    skipAvailable,
    personalizedPlanDays,
    personalizedPlanName,
    completePersonalizedPlanDay,
    completeProgramDay,
    isInAnyGroup,
    useSkipToken,
  } = useApp();
  const countdown = useCountdownToMidnight(completedToday);

  const enrollment = state.activeEnrollment;
  const plan = state.personalizedPlan;

  const planActive = enrollment?.kind === "plan" && !!plan;
  const planDay = plan ? Math.min(plan.currentDay, PLAN_DURATION_DAYS) : 1;
  const planEntry = planActive
    ? personalizedPlanDays.find((d) => d.day === planDay)
    : undefined;

  const programActive = enrollment?.kind === "program";
  const program = programActive ? getProgram(enrollment.programId) : undefined;
  const programProgress = program ? state.programs[program.id] : undefined;
  const programDay = program
    ? Math.min(programProgress?.currentDay ?? 1, program.durationDays)
    : 1;
  const programEntry = program
    ? program.days.find((d) => d.day === programDay)
    : undefined;

  const todayKey = new Date().toISOString().slice(0, 10);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const displayDone = completedToday;

  useEffect(() => {
    if (displayDone) setTimerDone(true);
  }, [displayDone]);

  const onPressComplete = async () => {
    if (displayDone) return;
    if (!timerDone) return;
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (planActive && planEntry) {
      if (isInAnyGroup()) {
        router.push({
          pathname: "/workout-photo",
          params: { source: "plan", day: String(planDay) },
        });
        return;
      }
      completePersonalizedPlanDay(planDay, {
        reps: estimateWorkoutReps(planEntry.exercises),
        minutes: planEntry.durationMinutes,
      });
      setTimeout(() => {
        maybeRequestFirstWorkoutReview().catch(() => {});
      }, 600);
      return;
    }
    if (programActive && program && programEntry) {
      if (isInAnyGroup()) {
        router.push({
          pathname: "/workout-photo",
          params: {
            source: "program",
            programId: program.id,
            day: String(programDay),
          },
        });
        return;
      }
      completeProgramDay(program.id, programDay, {
        reps: estimateWorkoutReps(programEntry.exercises),
        minutes: programEntry.durationMinutes,
      });
      setTimeout(() => {
        maybeRequestFirstWorkoutReview().catch(() => {});
      }, 600);
    }
  };

  const hasEnrollment = planActive || (programActive && !!program);

  const displayCategory = planActive && planEntry
    ? FOCUS_LABELS[planEntry.focus].toUpperCase()
    : programActive && program
    ? program.difficulty.toUpperCase()
    : "";
  const displayDuration = planActive && planEntry
    ? planEntry.durationMinutes
    : programEntry?.durationMinutes ?? 0;
  const displayTitle = planActive && planEntry
    ? planEntry.title
    : programEntry?.title ?? "";
  const displayExercises = planActive && planEntry
    ? planEntry.exercises
    : programEntry?.exercises ?? [];
  const displayMotivational = planActive
    ? "Built for you. Stay on plan."
    : "One day at a time. Stay consistent.";

  const currentLabel = planActive
    ? `TODAY · DAY ${planDay}`
    : programActive && program
    ? `TODAY · DAY ${programDay} / ${program.durationDays}`
    : "TODAY";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.appName}>
              {state.userName ? state.userName : "Athlete"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={styles.settingsBtn}
            testID="settings-btn"
          >
            <Settings color={Colors.textMuted} size={22} />
          </TouchableOpacity>
        </View>

        <View style={styles.streakCard}>
          <View style={styles.streakRow}>
            <View style={styles.flameCircle}>
              <Flame color={Colors.primary} size={26} fill={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakLabel}>Current streak</Text>
              <Text style={styles.streakValue}>
                Day {state.streak}{state.streak > 0 ? <Text style={styles.streakEmoji}> 🔥</Text> : null}
              </Text>
            </View>
            <View style={styles.badgeCompleted}>
              {completedToday ? (
                <>
                  <Check color={Colors.success} size={14} />
                  <Text style={styles.badgeText}>Done today</Text>
                </>
              ) : (
                <Text style={[styles.badgeText, { color: Colors.textMuted }]}>
                  Not yet
                </Text>
              )}
            </View>
          </View>
        </View>

        {hasEnrollment ? (
          <>
            <Text style={styles.sectionTitle}>{currentLabel}</Text>

            <View style={styles.workoutCard}>
              <LinearGradient
                colors={["#1F1411", "#141416"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.workoutHeader}>
                {displayCategory ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{displayCategory}</Text>
                  </View>
                ) : (
                  <View />
                )}
                <View style={styles.timePill}>
                  <Clock color={Colors.textMuted} size={12} />
                  <Text style={styles.timeText}>Under {displayDuration} min</Text>
                </View>
              </View>

              {(planActive || (programActive && program)) && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (planActive) {
                      router.push("/plan");
                    } else if (program) {
                      router.push({
                        pathname: "/program/[id]",
                        params: { id: program.id },
                      });
                    }
                  }}
                  style={styles.planEnrolledRow}
                  testID="enrolled-plan-link"
                >
                  {planActive ? (
                    <Target color={Colors.primary} size={12} />
                  ) : program ? (
                    <Trophy color={program.accent} size={12} />
                  ) : null}
                  <Text style={styles.planEnrolledText} numberOfLines={1}>
                    {planActive
                      ? personalizedPlanName
                      : program?.title ?? ""}
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.workoutTitle}>{displayTitle}</Text>

              <View style={styles.exerciseList}>
                {displayExercises.map((ex) => (
                  <ExerciseRow key={ex.name} name={ex.name} reps={ex.reps} />
                ))}
              </View>

              <Text style={styles.motivational}>
                &ldquo;{displayMotivational}&rdquo;
              </Text>

              {!displayDone && (
                <WorkoutTimer
                  exercises={displayExercises}
                  onDone={() => setTimerDone(true)}
                  testID="home-workout-timer"
                />
              )}

              {!displayDone && state.isPremium && (
                <View style={styles.skipRow}>
                  <Shield
                    color={skipAvailable ? Colors.accent : Colors.textDim}
                    size={14}
                  />
                  <Text
                    style={[
                      styles.skipText,
                      !skipAvailable && { color: Colors.textDim },
                    ]}
                  >
                    {skipAvailable
                      ? "1 Skip Available this week"
                      : "Skip used — resets weekly"}
                  </Text>
                </View>
              )}

              {!displayDone && !state.isPremium && (
                <TouchableOpacity
                  onPress={() => router.push("/paywall")}
                  style={styles.skipRowLocked}
                  activeOpacity={0.8}
                  testID="skip-upgrade"
                >
                  <Shield color={Colors.textDim} size={14} />
                  <Text style={styles.skipTextLocked}>
                    Unlock weekly streak skip with Pro
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onPressComplete}
                disabled={displayDone || !timerDone}
                style={styles.ctaWrap}
                testID="complete-workout-btn"
              >
                <LinearGradient
                  colors={
                    displayDone
                      ? [Colors.surface, Colors.surface]
                      : !timerDone
                      ? [Colors.surfaceElevated, Colors.surfaceElevated]
                      : [Colors.primary, Colors.primaryDark]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cta}
                >
                  {displayDone ? (
                    <>
                      <Check color={Colors.success} size={20} />
                      <Text style={[styles.ctaText, { color: Colors.success }]}>
                        Come Back Tomorrow
                      </Text>
                    </>
                  ) : !timerDone ? (
                    <Text style={[styles.ctaText, { color: Colors.textMuted }]}>
                      Finish the timer to complete
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.ctaText}>Complete Workout</Text>
                      <ArrowRight color={Colors.text} size={22} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {!displayDone && state.isPremium && skipAvailable && (
                <TouchableOpacity
                  onPress={async () => {
                    if (Platform.OS !== "web") {
                      await Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light
                      );
                    }
                    useSkipToken();
                  }}
                  style={styles.skipTokenBtn}
                  activeOpacity={0.85}
                  testID="use-skip-token-btn"
                >
                  <Shield color={Colors.accent} size={16} />
                  <Text style={styles.skipTokenText}>Use Skip Token</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <View style={styles.enrollCard}>
            <LinearGradient
              colors={["#1F1411", "#141416"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.enrollIcon}>
              <Sparkles color={Colors.primary} size={22} />
            </View>
            <Text style={styles.enrollTitle}>Pick your program</Text>
            <Text style={styles.enrollSub}>
              Enroll in a challenge or premium plan to unlock your daily task.
              You can only run one program at a time.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/premium")}
              activeOpacity={0.85}
              style={styles.ctaWrap}
              testID="enroll-cta"
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>Browse challenges & plans</Text>
                <ArrowRight color={Colors.text} size={22} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {!planActive && !programActive && (
          <TouchableOpacity
            style={styles.planCta}
            activeOpacity={0.85}
            onPress={() => router.push("/plan/setup")}
            testID="open-plan-setup"
          >
            <LinearGradient
              colors={["rgba(255,107,53,0.18)", "rgba(255,182,39,0.08)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.planCtaIcon}>
              <Sparkles color={Colors.primary} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planCtaTitle}>
                {state.isPremium
                  ? "Build your personalized plan"
                  : "Personalized plans"}
              </Text>
              <Text style={styles.planCtaSub}>
                {state.isPremium
                  ? "Pick focus areas and get a 60-day plan"
                  : "Tailored plans for your body · Pro"}
              </Text>
            </View>
            <ArrowRight color={Colors.textMuted} size={16} />
          </TouchableOpacity>
        )}

        <View style={styles.tip}>
          <Text style={styles.tipTitle}>One task a day.</Text>
          <Text style={styles.tipBody}>
            Enroll in one challenge or plan at a time. Switching mid-way pauses
            your previous program — consistency beats chaos.
          </Text>
          {completedToday && (
            <View style={styles.nextTimerRow}>
              <Clock color={Colors.accent} size={14} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nextTimerLabel}>
                  Time remaining until next workout
                </Text>
                <Text style={styles.nextTimerValue}>{countdown}</Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.hiddenKey}>{todayKey}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ExerciseRow({ name, reps }: { name: string; reps: string }) {
  const [open, setOpen] = useState<boolean>(false);
  const description = getExerciseDescription(name);
  return (
    <View style={styles.exerciseItem}>
      <View style={styles.exerciseRow}>
        <View style={styles.exerciseDot} />
        <Text style={styles.exerciseName}>{name}</Text>
        <TouchableOpacity
          onPress={() => setOpen((v) => !v)}
          style={[styles.infoBtn, open && styles.infoBtnActive]}
          hitSlop={10}
          testID={`home-info-${name}`}
        >
          <Info color={open ? Colors.primary : Colors.textMuted} size={12} />
        </TouchableOpacity>
        <Text style={styles.exerciseReps}>{reps}</Text>
      </View>
      {open && <Text style={styles.exerciseDesc}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { padding: 20, paddingBottom: 120 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { color: Colors.textMuted, fontSize: 14, fontWeight: "500" },
  appName: { color: Colors.text, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  streakCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  flameCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  streakLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: "500" },
  streakValue: { color: Colors.text, fontSize: 22, fontWeight: "800", marginTop: 2 },
  streakEmoji: { fontSize: 18 },
  badgeCompleted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: Colors.success, fontSize: 11, fontWeight: "700" },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 8,
  },
  progressLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: "600" },
  progressCount: { color: Colors.text, fontSize: 12, fontWeight: "700" },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  workoutCard: {
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  chip: {
    backgroundColor: "rgba(255,107,53,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  chipText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
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
  workoutTitle: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 18,
    lineHeight: 34,
  },
  exerciseList: { gap: 12, marginBottom: 20 },
  exerciseRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  exerciseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  exerciseName: { color: Colors.text, fontSize: 15, fontWeight: "600", flex: 1 },
  exerciseReps: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
  exerciseItem: { gap: 6 },
  infoBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBtnActive: { backgroundColor: "rgba(255,107,53,0.15)" },
  exerciseDesc: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    paddingLeft: 16,
    paddingRight: 4,
  },
  motivational: {
    color: Colors.textMuted,
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 16,
  },
  ctaWrap: { borderRadius: 16, overflow: "hidden" },
  cta: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaText: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  tip: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipTitle: { color: Colors.text, fontSize: 15, fontWeight: "800", marginBottom: 4 },
  tipBody: { color: Colors.textMuted, fontSize: 13, lineHeight: 19 },
  skipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,182,39,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,182,39,0.25)",
  },
  skipText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  skipRowLocked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipTextLocked: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  planBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  planIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  planSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  planEnrolledRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  planEnrolledText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  planCta: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.3)",
  },
  planCtaIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,107,53,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  planCtaTitle: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  planCtaSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  enrollCard: {
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  enrollIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  enrollTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  enrollSub: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18,
  },
  hiddenKey: { height: 0, opacity: 0 },
  skipTokenBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,182,39,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,182,39,0.3)",
  },
  skipTokenText: { color: Colors.accent, fontSize: 14, fontWeight: "800" },
  nextTimerRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nextTimerLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  nextTimerValue: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
});
