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
import { Stack, router, useLocalSearchParams } from "expo-router";
import { ArrowRight, Award, Share2 } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { estimateWorkoutReps, useApp } from "@/providers/AppProvider";
import { PROGRAMS, getProgram } from "@/constants/programs";

export default function ProgramRecapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useApp();
  const program = useMemo(() => getProgram(id ?? ""), [id]);
  const progress = program ? state.programs[program.id] : undefined;

  const byExercise = useMemo(() => {
    if (!program || !progress) return [] as { name: string; reps: number }[];
    const map: Record<string, number> = {};
    for (const d of program.days) {
      if (!progress.completedDays.includes(d.day)) continue;
      for (const ex of d.exercises) {
        const r = estimateWorkoutReps([ex]);
        map[ex.name] = (map[ex.name] ?? 0) + r;
      }
    }
    return Object.entries(map)
      .map(([name, reps]) => ({ name, reps }))
      .sort((a, b) => b.reps - a.reps);
  }, [program, progress]);

  if (!program) {
    return (
      <View style={styles.safe}>
        <Stack.Screen options={{ title: "Recap" }} />
        <Text style={styles.missing}>Program not found.</Text>
      </View>
    );
  }

  const completedCount = progress?.completedDays.length ?? 0;
  const pct = Math.round((completedCount / program.durationDays) * 100);
  const nextProgram = PROGRAMS.find(
    (p) => p.id !== program.id && p.type === program.type
  );

  const share = async () => {
    try {
      await Share.share({
        message: `I just finished "${program.title}" on OnStreak! ${completedCount}/${program.durationDays} days complete.`,
      });
    } catch (e) {
      console.log("share", e);
    }
  };

  return (
    <View style={styles.safe}>
      <Stack.Screen options={{ title: `${program.title} Recap` }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={[program.accentBg, "transparent"]}
          style={styles.hero}
        />

        <View style={[styles.crown, { backgroundColor: program.accentBg }]}>
          <Award color={program.accent} size={36} strokeWidth={2.4} />
        </View>
        <Text style={styles.label}>PROGRAM COMPLETE</Text>
        <Text style={styles.title}>{program.title}</Text>
        <Text style={styles.sub}>{program.subtitle}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Days done</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{pct}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{progress?.streak ?? 0}</Text>
            <Text style={styles.statLabel}>Best streak</Text>
          </View>
        </View>

        {byExercise.length > 0 && (
          <>
            <Text style={styles.section}>TOTAL REPS BY EXERCISE</Text>
            <View style={styles.card}>
              {byExercise.map((e, idx) => (
                <View
                  key={e.name}
                  style={[
                    styles.row,
                    idx < byExercise.length - 1 && styles.rowBorder,
                  ]}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: program.accent },
                    ]}
                  />
                  <Text style={styles.rowName}>{e.name}</Text>
                  <Text style={styles.rowValue}>
                    {e.reps.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={share}
          activeOpacity={0.85}
          testID="share-program-recap"
        >
          <LinearGradient
            colors={[program.accent, Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareGradient}
          >
            <Share2 color={Colors.text} size={16} />
            <Text style={styles.shareText}>Share</Text>
          </LinearGradient>
        </TouchableOpacity>

        {nextProgram && (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() =>
              router.replace({
                pathname: "/program/[id]",
                params: { id: nextProgram.id },
              })
            }
            activeOpacity={0.85}
            testID="next-program"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>NEXT UP</Text>
              <Text style={styles.nextTitle}>
                Start {nextProgram.title}
              </Text>
              <Text style={styles.nextSub}>
                {nextProgram.durationDays} days · {nextProgram.subtitle}
              </Text>
            </View>
            <ArrowRight color={Colors.text} size={20} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 60 },
  missing: { color: Colors.textMuted, padding: 40, textAlign: "center" },
  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 240,
  },
  crown: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  label: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
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
    fontSize: 15,
    marginTop: 4,
    marginBottom: 20,
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
  },
  statValue: { color: Colors.text, fontSize: 24, fontWeight: "900" },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  section: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowName: { color: Colors.text, fontSize: 14, fontWeight: "600", flex: 1 },
  rowValue: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  shareBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 12 },
  shareGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  shareText: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
  },
  nextLabel: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  nextTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  nextSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
});
