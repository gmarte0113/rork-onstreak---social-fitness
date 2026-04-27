import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Platform,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Scale,
  TrendingUp,
  X,
  Trash2,
  BarChart3,
  ArrowRight,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { toDateKey } from "@/constants/workouts";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function monthName(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function ProgressScreen() {
  const { state, setPhoto, deletePhoto } = useApp();
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));
  const [viewing, setViewing] = useState<{ slot: "before" | "after"; uri: string; date?: string } | null>(null);

  const days = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    const leading = (first.getDay() + 6) % 7;
    const total = last.getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const completedSet = useMemo(
    () => new Set(state.completedDates),
    [state.completedDates]
  );
  const todayKey = toDateKey(new Date());

  const monthCompleted = useMemo(() => {
    return days.filter((d) => d && completedSet.has(toDateKey(d))).length;
  }, [days, completedSet]);

  const pickImage = async (which: "before" | "after") => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setPhoto(which, result.assets[0].uri);
      }
    } catch (e) {
      console.log("pickImage error", e);
    }
  };

  const filledPhotos = useMemo(() => {
    const arr: { slot: "before" | "after"; uri: string; date?: string }[] = [];
    if (state.beforePhoto?.uri) {
      arr.push({ slot: "before", uri: state.beforePhoto.uri, date: state.beforePhoto.date });
    }
    if (state.afterPhoto?.uri) {
      arr.push({ slot: "after", uri: state.afterPhoto.uri, date: state.afterPhoto.date });
    }
    return arr;
  }, [state.beforePhoto, state.afterPhoto]);

  const nextEmptySlot: "before" | "after" | null = useMemo(() => {
    if (!state.beforePhoto?.uri) return "before";
    if (!state.afterPhoto?.uri) return "after";
    return null;
  }, [state.beforePhoto, state.afterPhoto]);

  const latestWeight = state.weights[state.weights.length - 1];
  const unit = state.weightUnit;
  const toDisplay = (kg: number): string => {
    const v = unit === "kg" ? kg : kg * 2.20462;
    return (Math.round(v * 10) / 10).toString();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.subtitle}>Your consistency in one place.</Text>

        <TouchableOpacity
          style={styles.insightsBtn}
          onPress={() => router.push("/insights")}
          activeOpacity={0.85}
          testID="open-insights"
        >
          <View style={styles.insightsIcon}>
            <BarChart3 color={Colors.accent} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightsTitle}>Progress insights</Text>
            <Text style={styles.insightsSub}>
              {state.isPremium
                ? "See your reps, time & consistency"
                : "Preview stats — full analytics with Pro"}
            </Text>
          </View>
          <ArrowRight color={Colors.textMuted} size={16} />
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.streak}</Text>
            <Text style={styles.statLabel}>Current streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.completedDates.length}</Text>
            <Text style={styles.statLabel}>Total workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{monthCompleted}</Text>
            <Text style={styles.statLabel}>This month</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.calHeader}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)
                )
              }
            >
              <ChevronLeft color={Colors.text} size={20} />
            </TouchableOpacity>
            <Text style={styles.calTitle}>{monthName(cursor)}</Text>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
                )
              }
            >
              <ChevronRight color={Colors.text} size={20} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={`${w}-${i}`} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {days.map((d, idx) => {
              if (!d) {
                return <View key={`empty-${idx}`} style={styles.cellEmpty} />;
              }
              const key = toDateKey(d);
              const isDone = completedSet.has(key);
              const isToday = key === todayKey;
              return (
                <View
                  key={key}
                  style={[
                    styles.cell,
                    isDone && styles.cellDone,
                    isToday && styles.cellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      isDone && styles.cellTextDone,
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Weight</Text>
          <TouchableOpacity onPress={() => router.push("/log-weight")}>
            <Text style={styles.linkText}>Log weight</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.weightRow}>
            <View style={styles.weightIcon}>
              <Scale color={Colors.primary} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              {latestWeight ? (
                <>
                  <Text style={styles.weightValue}>
                    {toDisplay(latestWeight.weightKg)} {unit}
                  </Text>
                  <Text style={styles.weightMeta}>
                    Logged {latestWeight.date}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.weightValue}>— {unit}</Text>
                  <Text style={styles.weightMeta}>No entries yet</Text>
                </>
              )}
            </View>
            <TrendingUp color={Colors.textMuted} size={18} />
          </View>
          {state.weights.length > 1 && (
            <View style={styles.historyList}>
              {state.weights.slice(-4).reverse().map((w, i) => (
                <View key={`${w.date ?? "nodate"}-${i}`} style={styles.historyRow}>
                  <Text style={styles.historyDate}>{w.date}</Text>
                  <Text style={styles.historyValue}>{toDisplay(w.weightKg)} {unit}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {state.weights.some((w) => w.photoUri) && (
          <>
            <Text style={styles.sectionTitle}>Weight Journey</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.journeyRow}
            >
              {[...state.weights]
                .filter((w) => w.photoUri)
                .slice()
                .reverse()
                .map((w, i) => (
                  <TouchableOpacity
                    key={`${w.date}-${i}`}
                    style={styles.journeyCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      w.photoUri &&
                      setViewing({ slot: "before", uri: w.photoUri, date: w.date })
                    }
                  >
                    {w.photoUri && (
                      <Image source={{ uri: w.photoUri }} style={styles.journeyImg} />
                    )}
                    <View style={styles.journeyMeta}>
                      <Text style={styles.journeyWeight}>
                        {toDisplay(w.weightKg)} {unit}
                      </Text>
                      <Text style={styles.journeyDate}>{w.date}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.sectionTitle}>Progress Photos</Text>
        <View style={styles.photosRow}>
          {filledPhotos.map((p) => (
            <PhotoSlot
              key={p.slot}
              uri={p.uri}
              date={p.date}
              onPick={() => setViewing({ slot: p.slot, uri: p.uri, date: p.date })}
            />
          ))}
          {nextEmptySlot && (
            <PhotoSlot
              key={`empty-${nextEmptySlot}`}
              onPick={() => pickImage(nextEmptySlot)}
            />
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!viewing}
        transparent
        animationType="fade"
        onRequestClose={() => setViewing(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewing(null)} />
          {viewing && (
            <View style={styles.modalContent}>
              <Image source={{ uri: viewing.uri }} style={styles.modalImage} resizeMode="contain" />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => setViewing(null)}
                  testID="photo-close"
                >
                  <X color={Colors.text} size={18} />
                  <Text style={styles.modalBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnDanger]}
                  onPress={() => {
                    const slot = viewing.slot;
                    const doDelete = () => {
                      deletePhoto(slot);
                      setViewing(null);
                    };
                    if (Platform.OS === "web") {
                      doDelete();
                    } else {
                      Alert.alert(
                        "Delete photo?",
                        "This will remove the photo from your progress.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: doDelete },
                        ]
                      );
                    }
                  }}
                  testID="photo-delete"
                >
                  <Trash2 color="#fff" size={18} />
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PhotoSlot({
  uri,
  date,
  onPick,
}: {
  uri?: string;
  date?: string;
  onPick: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.photoSlot}
      onPress={onPick}
      activeOpacity={0.8}
      testID={uri ? `photo-${date ?? "filled"}` : "photo-add"}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.photoImg} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Camera color={Colors.textMuted} size={26} />
          <Text style={styles.photoHint}>Tap to add</Text>
        </View>
      )}
      {uri && date && (
        <View style={styles.photoOverlay}>
          <Text style={styles.photoOverlayDate}>{date}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const CELL_SIZE = Platform.OS === "web" ? 38 : 40;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 120 },
  title: { color: Colors.text, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: Colors.textMuted, fontSize: 14, marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  insightsBtn: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  insightsIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,182,39,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  insightsTitle: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  insightsSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
  },
  statValue: { color: Colors.text, fontSize: 22, fontWeight: "800" },
  statLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "600", marginTop: 4 },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  calTitle: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  weekRow: { flexDirection: "row", marginBottom: 6 },
  weekday: {
    flex: 1,
    textAlign: "center",
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: "700",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  cellEmpty: { width: `${100 / 7}%`, height: CELL_SIZE },
  cellDone: {},
  cellToday: {},
  cellText: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
  cellTextDone: {
    color: Colors.text,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 32,
    overflow: "hidden",
    fontWeight: "800",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 12,
  },
  linkText: { color: Colors.primary, fontSize: 13, fontWeight: "700" },
  weightRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  weightIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  weightValue: { color: Colors.text, fontSize: 22, fontWeight: "800" },
  weightMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  historyList: { marginTop: 14, gap: 8 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  historyDate: { color: Colors.textMuted, fontSize: 13 },
  historyValue: { color: Colors.text, fontSize: 13, fontWeight: "700" },
  photosRow: { flexDirection: "row", gap: 10 },
  photoSlot: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoImg: { width: "100%", height: "100%" },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoLabel: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  photoHint: { color: Colors.textDim, fontSize: 11 },
  photoOverlay: {
    position: "absolute",
    left: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  photoOverlayLabel: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  photoOverlayDate: { color: Colors.textMuted, fontSize: 10 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  modalImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBtnDanger: {
    backgroundColor: "#e11d48",
    borderColor: "#e11d48",
  },
  modalBtnText: {
    color: Colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  journeyRow: { gap: 10, paddingRight: 20, paddingVertical: 4 },
  journeyCard: {
    width: 140,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  journeyImg: { width: "100%", height: 180 },
  journeyMeta: { padding: 10 },
  journeyWeight: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  journeyDate: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
});
