import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Check, Info, Lock, Pause, Play, Timer, X } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { estimateWorkoutReps, useApp } from "@/providers/AppProvider";
import { getExerciseDescription } from "@/constants/workouts";
import AnimatedCheckmark from "@/components/AnimatedCheckmark";
import { track } from "@/utils/analytics";
import {
  markFirstWorkoutCompletedIfNeeded,
  scheduleFirstWorkoutReviewPrompt,
} from "@/lib/review";

const REP_TIMER_SECONDS = 30;

function parseExerciseSeconds(reps: string): number | null {
  const m = reps.match(/(\d+)\s*(s|sec|second|seconds)\b/i);
  if (m) return parseInt(m[1], 10);
  const min = reps.match(/(\d+)\s*(m|min|minute|minutes)\b/i);
  if (min) return parseInt(min[1], 10) * 60;
  return null;
}

export default function WorkoutScreen() {
  const { todayWorkout, completeTodaysWorkout, completedToday, state, isInAnyGroup } = useApp();
  const [phase, setPhase] = useState<"ready" | "done">(
    completedToday ? "done" : "ready"
  );

  useEffect(() => {
    if (!completedToday) {
      track("workout_started", {
        plan: "daily",
        day: null,
        title: todayWorkout.title,
      });
    }
  }, [completedToday, todayWorkout.title]);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const scale = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === "done") {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [phase, scale, fade]);

  const allConfirmed = useMemo(
    () => todayWorkout.exercises.every((e) => confirmed[e.name]),
    [todayWorkout.exercises, confirmed]
  );
  const canComplete = allConfirmed;

  const toggleConfirm = async (name: string) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setConfirmed((c) => ({ ...c, [name]: !c[name] }));
  };


  const onComplete = async () => {
    if (!canComplete) return;
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (isInAnyGroup()) {
      router.replace({ pathname: "/workout-photo", params: { source: "today" } });
      return;
    }
    completeTodaysWorkout({
      reps: estimateWorkoutReps(todayWorkout.exercises),
      minutes: todayWorkout.durationMinutes,
    });
    scale.setValue(0);
    fade.setValue(0);
    setPhase("done");
    (async () => {
      try {
        const wasFirst = await markFirstWorkoutCompletedIfNeeded();
        if (wasFirst) {
          scheduleFirstWorkoutReviewPrompt(3000);
        }
      } catch (e) {
        console.log("[workout] review schedule error", e);
      }
    })();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1F1411", "#0A0A0B"]}
        style={StyleSheet.absoluteFill}
      />

      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        testID="close-workout"
      >
        <X color={Colors.text} size={22} />
      </TouchableOpacity>

      {phase === "ready" && (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {todayWorkout.category.replace("_", " ").toUpperCase()}
            </Text>
          </View>
          <Text style={styles.title}>{todayWorkout.title}</Text>
          <Text style={styles.time}>
            Takes under {todayWorkout.durationMinutes} minutes
          </Text>

          <View style={styles.list}>
            {todayWorkout.exercises.map((ex, i) => {
              const exerciseSeconds = parseExerciseSeconds(ex.reps);
              const isTimeBased = exerciseSeconds !== null;
              const timerSeconds = exerciseSeconds ?? REP_TIMER_SECONDS;
              return (
                <ExerciseItem
                  key={ex.name}
                  index={i}
                  name={ex.name}
                  reps={ex.reps}
                  timerSeconds={timerSeconds}
                  isTimeBased={isTimeBased}
                  confirmed={!!confirmed[ex.name]}
                  onConfirm={() => toggleConfirm(ex.name)}
                />
              );
            })}
          </View>

          <Text style={styles.motivational}>
            &ldquo;{todayWorkout.motivational}&rdquo;
          </Text>

          <TouchableOpacity
            style={styles.cta}
            onPress={onComplete}
            disabled={!canComplete}
            activeOpacity={0.85}
            testID="mark-complete-btn"
          >
            <LinearGradient
              colors={
                canComplete
                  ? [Colors.primary, Colors.primaryDark]
                  : [Colors.surfaceElevated, Colors.surfaceElevated]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              {canComplete ? (
                <>
                  <Check color={Colors.text} size={22} />
                  <Text style={styles.ctaText}>Mark as Complete</Text>
                </>
              ) : (
                <>
                  <Lock color={Colors.textMuted} size={18} />
                  <Text style={[styles.ctaText, { color: Colors.textMuted }]}>
                    Confirm all exercises
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}

      {phase === "done" && (
        <View style={styles.body}>
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <AnimatedCheckmark size={104} bgColor={Colors.primary} haptic={false} />
          </View>
          <Animated.View style={{ opacity: fade, alignItems: "center" }}>
            <Text style={styles.successTitle}>Nice work.</Text>
            <Text style={styles.successSub}>
              Day {state.streak} locked in. See you tomorrow.
            </Text>
            <View style={styles.streakPill}>
              <Text style={styles.streakPillEmoji}>🔥</Text>
              <Text style={styles.streakPillText}>
                {state.streak} day streak
              </Text>
            </View>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => router.back()}
              testID="done-btn"
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

function ExerciseItem({
  index,
  name,
  reps,
  timerSeconds,
  isTimeBased,
  confirmed,
  onConfirm,
}: {
  index: number;
  name: string;
  reps: string;
  timerSeconds: number;
  isTimeBased: boolean;
  confirmed: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<number>(timerSeconds);
  const [running, setRunning] = useState<boolean>(false);
  const description = getExerciseDescription(name);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      setRunning(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [running, remaining]);

  const timerDone = remaining <= 0;

  const toggleTimer = async () => {
    if (confirmed || timerDone) return;
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRunning((v) => !v);
  };

  const handleConfirm = () => {
    if (!confirmed && !timerDone) return;
    onConfirm();
  };

  const toggle = async () => {
    if (Platform.OS !== "web") {
      await Haptics.selectionAsync();
    }
    setOpen((v) => !v);
  };

  return (
    <View
      style={[
        styles.exerciseCard,
        confirmed && { borderColor: Colors.success, backgroundColor: "rgba(34,197,94,0.06)" },
      ]}
    >
      <View style={styles.exerciseTopRow}>
        <View
          style={[
            styles.exerciseIndex,
            confirmed && { backgroundColor: "rgba(34,197,94,0.2)" },
          ]}
        >
          <Text
            style={[
              styles.exerciseIndexText,
              confirmed && { color: Colors.success },
            ]}
          >
            {index + 1}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.exerciseNameRow}>
            <Text style={styles.exerciseName}>{name}</Text>
            <TouchableOpacity
              onPress={toggle}
              style={[styles.infoBtn, open && styles.infoBtnActive]}
              hitSlop={10}
              testID={`info-${name}`}
            >
              <Info
                color={open ? Colors.primary : Colors.textMuted}
                size={14}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.exerciseReps}>{reps}</Text>
        </View>
        <TouchableOpacity
          onPress={handleConfirm}
          style={[
            styles.doneCheck,
            confirmed && styles.doneCheckActive,
            !confirmed && !timerDone && styles.doneCheckDisabled,
          ]}
          testID={`confirm-${name}`}
          activeOpacity={0.8}
          disabled={!confirmed && !timerDone}
        >
          {confirmed ? (
            <Check color={Colors.text} size={16} strokeWidth={3} />
          ) : (
            <Text
              style={[
                styles.doneCheckText,
                !timerDone && { color: Colors.textMuted },
              ]}
            >
              Done
            </Text>
          )}
        </TouchableOpacity>
      </View>
      {!confirmed && (
        <View style={styles.timerRow}>
          <TouchableOpacity
            onPress={toggleTimer}
            style={[
              styles.timerBtn,
              running && styles.timerBtnActive,
              timerDone && styles.timerBtnDone,
            ]}
            disabled={timerDone}
            activeOpacity={0.8}
            testID={`timer-${name}`}
          >
            {timerDone ? (
              <Check color={Colors.success} size={14} strokeWidth={3} />
            ) : running ? (
              <Pause color={Colors.text} size={14} />
            ) : (
              <Play color={Colors.text} size={14} />
            )}
            <Text
              style={[
                styles.timerBtnText,
                timerDone && { color: Colors.success },
              ]}
            >
              {timerDone
                ? "Timer complete"
                : running
                ? `${remaining}s`
                : isTimeBased
                ? `Start ${timerSeconds}s timer`
                : `Start ${timerSeconds}s hold`}
            </Text>
          </TouchableOpacity>
          {!timerDone && (
            <View style={styles.timerHint}>
              <Timer color={Colors.textMuted} size={12} />
              <Text style={styles.timerHintText}>
                {isTimeBased ? "Hold for the full duration" : "Give it 30s of focus"}
              </Text>
            </View>
          )}
        </View>
      )}
      {open && (
        <View style={styles.descBox}>
          <Text style={styles.descText}>{description}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flexGrow: 1,
    padding: 28,
    paddingTop: 72,
    paddingBottom: 40,
    justifyContent: "center",
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,107,53,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 14,
  },
  chipText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  time: { color: Colors.textMuted, fontSize: 14, marginTop: 6, marginBottom: 14 },
  timerPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 20,
  },
  timerText: { fontSize: 11, fontWeight: "700" },
  list: { gap: 10, marginBottom: 24 },
  exerciseCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
  },
  exerciseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  exerciseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBtnActive: {
    backgroundColor: "rgba(255,107,53,0.15)",
  },
  doneCheck: {
    minWidth: 62,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  doneCheckActive: {
    backgroundColor: Colors.success,
  },
  doneCheckDisabled: {
    opacity: 0.5,
  },
  doneCheckText: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  timerRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  timerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  timerBtnActive: {
    backgroundColor: Colors.primary,
  },
  timerBtnDone: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  timerBtnText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  timerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
  },
  timerHintText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  descBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  descText: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  exerciseIndex: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseIndexText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  exerciseName: { color: Colors.text, fontSize: 16, fontWeight: "700" },
  exerciseReps: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  motivational: {
    color: Colors.textMuted,
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 20,
  },
  cta: { borderRadius: 16, overflow: "hidden" },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  ctaText: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  successCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 28,
  },
  successTitle: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
  },
  successSub: {
    color: Colors.textMuted,
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 24,
  },
  streakPillEmoji: { fontSize: 16 },
  streakPillText: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  doneBtn: {
    marginTop: 28,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
  },
  doneBtnText: { color: Colors.text, fontSize: 15, fontWeight: "700" },
});
