import React, { useMemo, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MedalImage } from "@/components/MedalImage";
import { MedalViewerModal } from "@/components/MedalViewerModal";
import { useApp } from "@/providers/AppProvider";
import { MEDALS, type Medal } from "@/constants/medals";
import { getProgram } from "@/constants/programs";

const SCREEN_W = Dimensions.get("window").width;
const GRID_PADDING_H = 20;
const GRID_GAP = 12;
const COLUMNS = 3;
const TILE_W = Math.floor(
  (SCREEN_W - GRID_PADDING_H * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS
);
const MEDAL_SIZE = TILE_W - 8;

type Section = {
  key: string;
  label: string;
  medals: Medal[];
};

function streakSubtitle(threshold: number | undefined): string {
  if (!threshold) return "";
  if (threshold === 1) return "1 day";
  if (threshold === 7) return "A week";
  if (threshold === 14) return "Two weeks";
  if (threshold === 30) return "A month";
  if (threshold === 60) return "Two months";
  return `${threshold} days`;
}

function streakLabel(threshold: number | undefined): string {
  if (!threshold) return "";
  return `${threshold}`;
}

export default function MedalsScreen() {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const [viewerMedal, setViewerMedal] = useState<Medal | null>(null);

  const earnedIds = useMemo(
    () => new Set(state.medals.map((m) => m.id)),
    [state.medals]
  );

  const openViewer = useCallback((medal: Medal) => {
    setViewerMedal(medal);
  }, []);
  const closeViewer = useCallback(() => {
    setViewerMedal(null);
  }, []);

  const sections = useMemo<Section[]>(() => {
    const streaks = MEDALS.filter((m) => m.kind === "streak");
    const personal = MEDALS.filter((m) => m.kind === "personal-plan");
    const programIds = MEDALS.filter((m) => m.kind === "program");
    const challenges: Medal[] = [];
    const plans: Medal[] = [...personal];
    programIds.forEach((m) => {
      const programId = m.id.startsWith("program:")
        ? m.id.slice("program:".length)
        : m.id;
      const p = getProgram(programId);
      if (p?.type === "challenge") challenges.push(m);
      else plans.push(m);
    });
    const result: Section[] = [];
    if (streaks.length > 0) {
      result.push({ key: "streaks", label: "STREAKS", medals: streaks });
    }
    if (plans.length > 0) {
      result.push({ key: "plans", label: "PLANS", medals: plans });
    }
    if (challenges.length > 0) {
      result.push({ key: "challenges", label: "CHALLENGES", medals: challenges });
    }
    return result;
  }, []);

  const total = MEDALS.length;
  const earnedCount = state.medals.length;
  const pct = Math.round((earnedCount / Math.max(1, total)) * 100);

  return (
    <View style={styles.safe}>
      <ScreenHeader variant="floating" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Medals</Text>
          <Text style={styles.subtitle}>
            {earnedCount} of {total} unlocked
          </Text>
        </View>

        <View style={styles.progressCard}>
          <LinearGradient
            colors={["rgba(255,107,53,0.18)", "rgba(255,107,53,0.04)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>COLLECTION PROGRESS</Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[Colors.primary, "#FFB627"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${pct}%` }]}
            />
          </View>
        </View>

        {sections.map((s) => {
          const earnedInSection = s.medals.filter((m) =>
            earnedIds.has(m.id)
          ).length;
          return (
            <View key={s.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>{s.label}</Text>
                <Text style={styles.sectionCount}>
                  {earnedInSection}/{s.medals.length}
                </Text>
              </View>
              <View style={styles.grid}>
                {s.medals.map((m) => (
                  <MedalTile
                    key={m.id}
                    medal={m}
                    earned={earnedIds.has(m.id)}
                    onPress={openViewer}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
      <MedalViewerModal
        visible={viewerMedal !== null}
        onClose={closeViewer}
        uri={viewerMedal?.image ?? ""}
        title={
          viewerMedal
            ? viewerMedal.kind === "streak"
              ? `${viewerMedal.threshold}-Day Streak`
              : viewerMedal.title
            : ""
        }
        subtitle={
          viewerMedal
            ? viewerMedal.kind === "streak"
              ? streakSubtitle(viewerMedal.threshold)
              : viewerMedal.subtitle
            : ""
        }
      />
    </View>
  );
}

function MedalTile({
  medal,
  earned,
  onPress,
}: {
  medal: Medal;
  earned: boolean;
  onPress: (medal: Medal) => void;
}) {
  const isStreak = medal.kind === "streak";
  const displayTitle = isStreak
    ? `${medal.threshold}-Day Streak`
    : medal.title;
  const sub = isStreak
    ? streakSubtitle(medal.threshold)
    : earned
    ? medal.subtitle
    : "Locked";

  const handlePress = useCallback(() => {
    if (earned) onPress(medal);
  }, [earned, medal, onPress]);

  return (
    <Pressable
      style={styles.tile}
      onPress={handlePress}
      disabled={!earned}
      testID={`medal-tile-${medal.id}`}
    >
      <View style={styles.tileInner} pointerEvents="none">
        <MedalImage uri={medal.image} size={MEDAL_SIZE} earned={earned} enableTilt={false} />
      </View>
      <Text
        style={[styles.tileTitle, !earned && styles.tileTitleLocked]}
        numberOfLines={2}
      >
        {displayTitle}
      </Text>
      <Text
        style={[styles.tileSub, !earned && styles.tileSubLocked]}
        numberOfLines={1}
      >
        {sub}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { paddingHorizontal: GRID_PADDING_H, paddingBottom: 120 },
  headerBlock: {
    marginBottom: 16,
    paddingLeft: 56,
  },
  title: {
    color: Colors.text,
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 42,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  progressCard: {
    borderRadius: 18,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.25)",
    marginBottom: 28,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  progressPct: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  sectionCount: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  tile: {
    width: TILE_W,
    alignItems: "center",
  },
  tileInner: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tileTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 10,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  tileTitleLocked: {
    color: "rgba(255,255,255,0.5)",
  },
  tileSub: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    alignSelf: "flex-start",
  },
  tileSubLocked: {
    color: Colors.textDim,
  },
});
