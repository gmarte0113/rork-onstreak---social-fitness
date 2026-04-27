import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Check, Pause, Play, Timer } from "lucide-react-native";
import { Colors } from "@/constants/colors";

const REP_TIMER_SECONDS = 30;

function parseExerciseSeconds(reps: string): number | null {
  const m = reps.match(/(\d+)\s*(s|sec|second|seconds)\b/i);
  if (m) return parseInt(m[1], 10);
  const min = reps.match(/(\d+)\s*(m|min|minute|minutes)\b/i);
  if (min) return parseInt(min[1], 10) * 60;
  return null;
}

export function computeWorkoutTimerSeconds(
  exercises: { name: string; reps: string }[]
): number {
  if (!exercises.length) return REP_TIMER_SECONDS;
  return exercises.reduce((acc, ex) => {
    const s = parseExerciseSeconds(ex.reps);
    return acc + (s ?? REP_TIMER_SECONDS);
  }, 0);
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m <= 0) return `${sec}s`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

type Props = {
  exercises: { name: string; reps: string }[];
  onDone?: () => void;
  disabled?: boolean;
  testID?: string;
};

export default function WorkoutTimer({
  exercises,
  onDone,
  disabled,
  testID,
}: Props) {
  const totalSeconds = useMemo(
    () => computeWorkoutTimerSeconds(exercises),
    [exercises]
  );
  const [remaining, setRemaining] = useState<number>(totalSeconds);
  const [running, setRunning] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const progress = useRef(new Animated.Value(0)).current;
  const firedRef = useRef<boolean>(false);

  useEffect(() => {
    setRemaining(totalSeconds);
    setRunning(false);
    setDone(false);
    firedRef.current = false;
    progress.setValue(0);
  }, [totalSeconds, progress]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(t);
  }, [running, remaining]);

  useEffect(() => {
    if (remaining <= 0 && !done) {
      setRunning(false);
      setDone(true);
      if (!firedRef.current) {
        firedRef.current = true;
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          ).catch(() => {});
        }
        onDone?.();
      }
    }
  }, [remaining, done, onDone]);

  useEffect(() => {
    const pct = 1 - remaining / totalSeconds;
    Animated.timing(progress, {
      toValue: pct,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [remaining, totalSeconds, progress]);

  const onPress = async () => {
    if (disabled || done) return;
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRunning((v) => !v);
  };

  const widthPct = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={[styles.wrap, done && styles.wrapDone]}
      testID={testID ?? "workout-timer"}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          done && styles.fillDone,
          { width: widthPct as unknown as string },
        ]}
      />
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        disabled={disabled || done}
        style={styles.row}
        testID="workout-timer-btn"
      >
        <View style={styles.iconWrap}>
          {done ? (
            <Check color={Colors.success} size={16} strokeWidth={3} />
          ) : running ? (
            <Pause color={Colors.text} size={14} />
          ) : (
            <Play color={Colors.text} size={14} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.label, done && { color: Colors.success }]}
            numberOfLines={1}
          >
            {done
              ? "Workout timer complete"
              : running
              ? "Workout in progress"
              : `Start ${formatSeconds(totalSeconds)} workout timer`}
          </Text>
          {!done && (
            <View style={styles.hint}>
              <Timer color={Colors.textMuted} size={11} />
              <Text style={styles.hintText}>
                {running
                  ? `${formatSeconds(remaining)} remaining`
                  : "Tap to begin · runs for the length of your workout"}
              </Text>
            </View>
          )}
        </View>
        {!done && (
          <Text style={styles.time}>{formatSeconds(remaining)}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    overflow: "hidden",
    marginBottom: 12,
  },
  wrapDone: {
    borderColor: "rgba(34,197,94,0.4)",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255,107,53,0.18)",
  },
  fillDone: { backgroundColor: "rgba(34,197,94,0.12)" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  hintText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  time: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    minWidth: 48,
    textAlign: "right",
  },
});
