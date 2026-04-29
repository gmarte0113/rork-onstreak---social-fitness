import React, { useMemo, useRef, useState } from "react";
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
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from "react-native-svg";
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  X,
  Trash2,
  ArrowRight,
  LineChart,
  Plus,
  ChevronsRight,
  Award,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { toDateKey } from "@/constants/workouts";
import { MEDALS } from "@/constants/medals";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

type PhotoSlot =
  | { kind: "before" }
  | { kind: "after" }
  | { kind: "extra"; index: number };

export default function ProgressScreen() {
  const { state, setPhoto, deletePhoto, addExtraPhoto, deleteExtraPhoto } = useApp();
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));
  const [viewing, setViewing] = useState<{ slot: PhotoSlot; uri: string; date?: string } | null>(null);

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
  const today = new Date();

  const monthCompleted = useMemo(() => {
    return days.filter((d) => d && completedSet.has(toDateKey(d))).length;
  }, [days, completedSet]);

  const todayDayNum = today.getDate();
  const todayMonthShort = today.toLocaleDateString(undefined, { month: "short" }).toUpperCase();

  const pickAndAddPhoto = async () => {
    try {
      const todayKeyLocal = toDateKey(new Date());
      const hasPhotoToday =
        state.beforePhoto?.date === todayKeyLocal ||
        state.afterPhoto?.date === todayKeyLocal ||
        (state.extraPhotos ?? []).some((p) => p.date === todayKeyLocal);
      if (hasPhotoToday) {
        Alert.alert(
          "Daily limit reached",
          "You can only add one progress photo per day. Come back tomorrow!"
        );
        return;
      }
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
        const uri = result.assets[0].uri;
        if (!state.beforePhoto?.uri) {
          setPhoto("before", uri);
        } else if (!state.afterPhoto?.uri) {
          setPhoto("after", uri);
        } else {
          addExtraPhoto(uri);
        }
      }
    } catch (e) {
      console.log("pickImage error", e);
    }
  };

  const filledPhotos = useMemo(() => {
    const arr: { slot: PhotoSlot; uri: string; date?: string }[] = [];
    if (state.beforePhoto?.uri) {
      arr.push({ slot: { kind: "before" }, uri: state.beforePhoto.uri, date: state.beforePhoto.date });
    }
    if (state.afterPhoto?.uri) {
      arr.push({ slot: { kind: "after" }, uri: state.afterPhoto.uri, date: state.afterPhoto.date });
    }
    (state.extraPhotos ?? []).forEach((p, i) => {
      arr.push({ slot: { kind: "extra", index: i }, uri: p.uri, date: p.date });
    });
    return arr;
  }, [state.beforePhoto, state.afterPhoto, state.extraPhotos]);

  const unit = state.weightUnit;
  const toDisplay = (kg: number): number => {
    const v = unit === "kg" ? kg : kg * 2.20462;
    return Math.round(v * 10) / 10;
  };

  const weightStats = useMemo(() => {
    const ws = state.weights;
    if (ws.length === 0) {
      return null;
    }
    const latest = ws[ws.length - 1];
    const first = ws[0];
    const latestVal = toDisplay(latest.weightKg);
    const firstVal = toDisplay(first.weightKg);
    const change = Math.round((latestVal - firstVal) * 10) / 10;
    return {
      latestVal,
      firstVal,
      change,
      latestDate: latest.date ?? "",
      firstDate: first.date ?? "",
      count: ws.length,
    };
  }, [state.weights, unit]);

  const photoCount = filledPhotos.length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Progress</Text>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/insights")}
          testID="open-insights"
          style={styles.insightsWrap}
        >
          <LinearGradient
            colors={["#1A1410", "#3D1F0E", "#7A2F0A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.insightsCard}
          >
            <View style={styles.insightsIcon}>
              <LineChart color={Colors.primary} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightsTitle}>Insights</Text>
              <Text style={styles.insightsSub}>
                See your reps, time & consistency
              </Text>
            </View>
            <View style={styles.insightsArrow}>
              <ArrowRight color="#fff" size={18} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/medals")}
          testID="open-medals"
          style={styles.insightsWrap}
        >
          <LinearGradient
            colors={["#1A1410", "#3D1F0E", "#7A2F0A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.insightsCard}
          >
            <View style={styles.insightsIcon}>
              <Award color={Colors.primary} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightsTitle}>Medals</Text>
              <Text style={styles.insightsSub}>
                {state.medals.length} of {MEDALS.length} unlocked
              </Text>
              <View style={styles.medalsProgressTrack}>
                <View
                  style={[
                    styles.medalsProgressFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.round((state.medals.length / Math.max(1, MEDALS.length)) * 100)
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.insightsArrow}>
              <ArrowRight color="#fff" size={18} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={[styles.statCol, styles.statColFirst]}>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValueBig, { color: Colors.primary }]}>
                {state.streak}
              </Text>
              <Text style={styles.statValueSuffix}>DAYS</Text>
            </View>
            <Text style={styles.statLabel}>STREAK</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <View style={styles.statValueRow}>
              <Text style={styles.statValueBig}>{state.completedDates.length}</Text>
            </View>
            <Text style={styles.statLabel}>WORKOUTS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <View style={styles.statValueRow}>
              <Text style={styles.statValueBig}>{todayDayNum}</Text>
              <Text style={styles.statValueSuffix}>{todayMonthShort}</Text>
            </View>
            <Text style={styles.statLabel}>THIS MONTH</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>CALENDAR</Text>
        <View style={styles.calendarCard}>
          <LinearGradient
            colors={["#FF7A3D", "#E8561F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.calendarHeader}
          >
            <View style={styles.calendarHeaderDots} pointerEvents="none" />
            <View style={{ flex: 1 }}>
              <Text style={styles.calendarMonth}>
                {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" }).toUpperCase()}
              </Text>
              <View style={styles.calendarSessionRow}>
                <Text style={styles.calendarSessionNum}>{monthCompleted}</Text>
                <Text style={styles.calendarSessionLabel}>SESSIONS</Text>
              </View>
            </View>
            <View style={styles.calArrows}>
              <TouchableOpacity
                style={styles.calArrowBtn}
                onPress={() =>
                  setCursor(
                    new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)
                  )
                }
                testID="cal-prev"
              >
                <ChevronLeft color="#fff" size={18} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calArrowBtn}
                onPress={() =>
                  setCursor(
                    new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
                  )
                }
                testID="cal-next"
              >
                <ChevronRight color="#fff" size={18} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.calendarBody}>
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
                const isPast = d.getTime() < today.getTime() && !isToday;
                const isMissed = isPast && !isDone;
                return (
                  <View key={key} style={styles.cell}>
                    {isToday ? (
                      <View style={styles.dotToday} />
                    ) : isDone ? (
                      <View style={styles.dotDone} />
                    ) : isMissed ? (
                      <View style={styles.dotMissed} />
                    ) : (
                      <View style={styles.dotFuture} />
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={styles.dotDone} />
                <Text style={styles.legendText}>TRAINED</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.dotToday} />
                <Text style={styles.legendText}>TODAY</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.dotMissed} />
                <Text style={styles.legendText}>BROKEN</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>WEIGHT</Text>
        <View style={styles.weightCard}>
          <View style={styles.weightTopRow}>
            <View style={styles.weightBadge}>
              <Text style={styles.weightBadgeText}>WEIGHT · 30 DAYS</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/log-weight")}
              testID="log-weight-btn"
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logWeightBtn}
              >
                <Plus color="#fff" size={16} />
                <Text style={styles.logWeightText}>Log weight</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {weightStats ? (
            <>
              <View style={styles.weightValueRow}>
                <Text style={styles.weightBig}>{weightStats.latestVal}</Text>
                <Text style={styles.weightUnit}>{unit.toUpperCase()}</Text>
                {weightStats.change !== 0 && (
                  <Text
                    style={[
                      styles.weightChange,
                      {
                        color:
                          weightStats.change < 0 ? Colors.success : Colors.danger,
                      },
                    ]}
                  >
                    {weightStats.change > 0 ? "+" : ""}
                    {weightStats.change}
                  </Text>
                )}
              </View>
              <Text style={styles.weightMeta}>
                Latest entry · {weightStats.latestDate}
              </Text>

              <WeightChart
                weights={state.weights.map((w) => toDisplay(w.weightKg))}
                latestVal={weightStats.latestVal}
              />

              <View style={styles.weightStatsRow}>
                <View style={styles.weightStatCol}>
                  <Text style={styles.weightStatVal}>{weightStats.firstVal}</Text>
                  <Text style={styles.weightStatLabel}>STARTING</Text>
                  <Text style={styles.weightStatSub}>{weightStats.firstDate}</Text>
                </View>
                <View style={styles.weightStatDivider} />
                <View style={styles.weightStatCol}>
                  <Text style={styles.weightStatVal}>{weightStats.latestVal}</Text>
                  <Text style={styles.weightStatLabel}>CURRENT</Text>
                  <Text style={styles.weightStatSub}>{weightStats.latestDate}</Text>
                </View>
                <View style={styles.weightStatDivider} />
                <View style={styles.weightStatCol}>
                  <Text
                    style={[
                      styles.weightStatVal,
                      {
                        color:
                          weightStats.change <= 0
                            ? Colors.success
                            : Colors.danger,
                      },
                    ]}
                  >
                    {weightStats.change > 0 ? "+" : ""}
                    {weightStats.change}
                  </Text>
                  <Text style={styles.weightStatLabel}>
                    {unit.toUpperCase()} {weightStats.change <= 0 ? "LOST" : "GAINED"}
                  </Text>
                  <Text style={styles.weightStatSub}>
                    {weightStats.count} entries
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.weightEmpty}>
              <Text style={styles.weightBig}>— {unit}</Text>
              <Text style={styles.weightMeta}>No entries yet · tap Log weight</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>PHOTOS</Text>
        <View style={styles.photosCard}>
          <View style={styles.weightTopRow}>
            <View style={styles.photosBadge}>
              <Text style={styles.photosBadgeText}>PHOTOS · {photoCount}</Text>
            </View>
          </View>

          <Text style={styles.photosTitle}>Progress photos</Text>
          <Text style={styles.photosSub}>Compare side-by-side · weekly</Text>

          <PhotoTimeline
            photos={filledPhotos.map((p) => ({
              ...p,
              weight: weightForDate(state.weights, p.date, toDisplay, unit),
            }))}
            onAdd={pickAndAddPhoto}
            onOpen={(p) => setViewing({ slot: p.slot, uri: p.uri, date: p.date })}
          />
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
                      if (slot.kind === "extra") {
                        deleteExtraPhoto(slot.index);
                      } else {
                        deletePhoto(slot.kind);
                      }
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

function WeightChart({ weights, latestVal }: { weights: number[]; latestVal: number }) {
  const W = 320;
  const H = 140;
  const PAD = 12;
  const data = weights.length > 0 ? weights : [0];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;

  const points = data.map((v, i) => {
    const x = PAD + i * stepX;
    const y = PAD + ((max - v) / range) * (H - PAD * 2);
    return { x, y };
  });

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
  const fillD = `${pathD} L ${points[points.length - 1]?.x ?? PAD} ${H} L ${points[0]?.x ?? PAD} ${H} Z`;

  const last = points[points.length - 1];

  return (
    <View style={styles.chartWrap}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="gradFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#22C55E" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#22C55E" stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path d={fillD} fill="url(#gradFill)" />
        <Path d={pathD} stroke="#22C55E" strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#22C55E" />
        ))}
      </Svg>
      {last && weights.length > 0 && (
        <View style={styles.chartTag}>
          <Text style={styles.chartTagText}>{latestVal}</Text>
        </View>
      )}
    </View>
  );
}

function weightForDate(
  weights: { date?: string; weightKg: number }[],
  date: string | undefined,
  toDisplay: (kg: number) => number,
  unit: string,
): string | undefined {
  if (!date) return undefined;
  const match = weights.find((w) => w.date === date);
  if (!match) return undefined;
  return `${toDisplay(match.weightKg)} ${unit.toUpperCase()}`;
}

function formatPhotoDate(date?: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type TimelinePhoto = {
  slot: PhotoSlot;
  uri: string;
  date?: string;
  weight?: string;
};

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = Math.min(280, SCREEN_W - 100);
const CARD_GAP = 14;
const SNAP_INTERVAL = CARD_W + CARD_GAP;

function PhotoTimeline({
  photos,
  onAdd,
  onOpen,
}: {
  photos: TimelinePhoto[];
  onAdd: () => void;
  onOpen: (p: TimelinePhoto) => void;
}) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const hintAnim = useRef(new Animated.Value(0)).current;
  const [hasScrolled, setHasScrolled] = useState<boolean>(false);

  React.useEffect(() => {
    if (photos.length < 2 || hasScrolled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(hintAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [photos.length, hasScrolled, hintAnim]);

  if (photos.length === 0) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onAdd}
        style={styles.emptyTimeline}
        testID="photo-add-first"
      >
        <View style={styles.emptyTimelineIcon}>
          <Plus color={Colors.primary} size={28} />
        </View>
        <Text style={styles.emptyTimelineTitle}>Add your first progress photo</Text>
        <Text style={styles.emptyTimelineSub}>Track your transformation over time</Text>
      </TouchableOpacity>
    );
  }

  const items: (TimelinePhoto | { add: true })[] = [...photos, { add: true }];

  const sidePadding = (SCREEN_W - CARD_W) / 2 - 36;
  const showHint = photos.length >= 2 && !hasScrolled;
  const hintTranslate = hintAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });

  return (
    <View>
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={SNAP_INTERVAL}
      snapToAlignment="start"
      contentContainerStyle={{
        paddingHorizontal: Math.max(0, sidePadding),
        paddingVertical: 16,
        gap: CARD_GAP,
      }}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
          useNativeDriver: true,
          listener: (e) => {
            const x = (e.nativeEvent as { contentOffset: { x: number } }).contentOffset.x;
            if (x > 12 && !hasScrolled) setHasScrolled(true);
          },
        },
      )}
      scrollEventThrottle={16}
      testID="photo-timeline"
    >
      {items.map((item, i) => {
        const inputRange = [
          (i - 1) * SNAP_INTERVAL,
          i * SNAP_INTERVAL,
          (i + 1) * SNAP_INTERVAL,
        ];
        const scale = scrollX.interpolate({
          inputRange,
          outputRange: [0.9, 1, 0.9],
          extrapolate: "clamp",
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.55, 1, 0.55],
          extrapolate: "clamp",
        });

        if ("add" in item) {
          return (
            <Animated.View
              key="add-card"
              style={[styles.timelineCardWrap, { transform: [{ scale }], opacity }]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.addCard}
                onPress={onAdd}
                testID="photo-add"
              >
                <View style={styles.addCardIcon}>
                  <Plus color={Colors.primary} size={32} />
                </View>
                <Text style={styles.addCardTitle}>Add photo</Text>
                <Text style={styles.addCardSub}>Capture today</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        }

        const isLatest = i === photos.length - 1 && photos.length > 0;
        const slotKey =
          item.slot.kind === "extra" ? `extra-${item.slot.index}` : item.slot.kind;
        return (
          <Animated.View
            key={slotKey}
            style={[styles.timelineCardWrap, { transform: [{ scale }], opacity }]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.timelineCard, isLatest && styles.timelineCardLatest]}
              onPress={() => onOpen(item)}
              testID={`photo-${item.date ?? slotKey}`}
            >
              <Image source={{ uri: item.uri }} style={styles.timelineImg} />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.85)"]}
                style={styles.timelineGradient}
                pointerEvents="none"
              />
              {isLatest && (
                <View style={styles.timelineLatestBadge}>
                  <View style={styles.timelineLatestDot} />
                  <Text style={styles.timelineLatestText}>LATEST</Text>
                </View>
              )}
              <View style={styles.timelineMeta}>
                <Text style={styles.timelineDate}>{formatPhotoDate(item.date)}</Text>
                {item.weight && (
                  <Text style={styles.timelineWeight}>{item.weight}</Text>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </Animated.ScrollView>
      {showHint && (
        <Animated.View
          pointerEvents="none"
          style={[styles.swipeHint, { transform: [{ translateX: hintTranslate }] }]}
        >
          <Text style={styles.swipeHintText}>Swipe</Text>
          <ChevronsRight color={Colors.primary} size={14} />
        </Animated.View>
      )}
    </View>
  );
}

function PhotoTile({
  uri,
  date,
  isLatest,
  onPick,
}: {
  uri?: string;
  date?: string;
  isLatest?: boolean;
  onPick: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.photoTile,
        isLatest && styles.photoTileLatest,
      ]}
      onPress={onPick}
      activeOpacity={0.85}
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
      {isLatest && uri && (
        <View style={styles.latestBadge}>
          <Text style={styles.latestBadgeText}>LATEST</Text>
        </View>
      )}
      {uri && date && (
        <View style={styles.photoDateOverlay}>
          <Text style={styles.photoDateText}>{date}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { padding: 20, paddingBottom: 140 },

  title: {
    color: Colors.text,
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 20,
  },

  insightsWrap: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
  },
  insightsCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  insightsIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "rgba(255,107,53,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.3)",
  },
  insightsTitle: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  insightsSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  insightsArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  medalsProgressTrack: {
    marginTop: 8,
    height: 5,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  medalsProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },

  statsRow: {
    flexDirection: "row",
    backgroundColor: "#0F0F11",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    paddingVertical: 18,
    marginBottom: 28,
  },
  statCol: { flex: 1, alignItems: "center", justifyContent: "center" },
  statColFirst: {},
  statValueRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  statValueBig: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 32,
  },
  statValueSuffix: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 6,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 6,
  },

  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },

  calendarCard: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#0F0F11",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 28,
  },
  calendarHeader: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  calendarHeaderDots: {
    position: "absolute",
    inset: 0 as unknown as number,
    opacity: 0.15,
  },
  calendarMonth: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  calendarSessionRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  calendarSessionNum: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 38,
  },
  calendarSessionLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  calArrows: { flexDirection: "row", gap: 8 },
  calArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  calendarBody: { padding: 16, paddingTop: 18 },
  weekRow: { flexDirection: "row", marginBottom: 12 },
  weekday: {
    flex: 1,
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cellEmpty: { width: `${100 / 7}%`, height: 28 },

  dotDone: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  dotToday: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: "transparent",
  },
  dotMissed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,107,53,0.35)",
  },
  dotFuture: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  legendRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  weightCard: {
    backgroundColor: "#101013",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 22,
    padding: 18,
    marginBottom: 28,
  },
  weightTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  weightBadge: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  weightBadgeText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  logWeightBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  logWeightText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  weightValueRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  weightBig: {
    color: Colors.text,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  weightUnit: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  weightChange: {
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 8,
    marginBottom: 8,
  },
  weightMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  weightEmpty: { paddingVertical: 16 },

  chartWrap: { marginTop: 16, marginBottom: 8, position: "relative" },
  chartTag: {
    position: "absolute",
    top: 6,
    right: 0,
    backgroundColor: "rgba(34,197,94,0.18)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chartTagText: { color: Colors.success, fontSize: 12, fontWeight: "800" },

  weightStatsRow: {
    flexDirection: "row",
    marginTop: 14,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  weightStatCol: { flex: 1, alignItems: "center" },
  weightStatVal: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  weightStatLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 4,
  },
  weightStatSub: { color: Colors.textDim, fontSize: 11, marginTop: 4 },
  weightStatDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  photosCard: {
    backgroundColor: "#101013",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 22,
    padding: 18,
    marginBottom: 28,
  },
  photosBadge: {
    backgroundColor: "rgba(167,139,250,0.12)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  photosBadgeText: {
    color: "#A78BFA",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  addPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.4)",
    backgroundColor: "rgba(167,139,250,0.08)",
  },
  addPhotoText: { color: "#A78BFA", fontSize: 14, fontWeight: "800" },

  photosTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 8,
  },
  photosSub: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },

  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  photoTile: {
    width: "48%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    position: "relative",
    opacity: 0.6,
  },
  photoTileLatest: {
    borderWidth: 2,
    borderColor: Colors.primary,
    opacity: 1,
  },
  photoImg: { width: "100%", height: "100%" },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoHint: { color: Colors.textDim, fontSize: 11 },
  latestBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(255,107,53,0.18)",
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  latestBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  photoDateOverlay: {
    position: "absolute",
    left: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  photoDateText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  timelineCardWrap: {
    width: CARD_W,
  },
  timelineCard: {
    width: CARD_W,
    aspectRatio: 3 / 4,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  timelineCardLatest: {
    borderWidth: 2,
    borderColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  timelineImg: { width: "100%", height: "100%" },
  timelineGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  timelineLatestBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  timelineLatestDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  timelineLatestText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  timelineMeta: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  timelineDate: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  timelineWeight: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  addCard: {
    width: CARD_W,
    aspectRatio: 3 / 4,
    borderRadius: 22,
    backgroundColor: "rgba(255,107,53,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,107,53,0.35)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  addCardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,107,53,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  addCardTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  addCardSub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyTimeline: {
    marginTop: 16,
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: "rgba(255,107,53,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,107,53,0.35)",
    borderStyle: "dashed",
    alignItems: "center",
    gap: 10,
  },
  emptyTimelineIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,107,53,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTimelineTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  emptyTimelineSub: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  swipeHint: {
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,107,53,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.30)",
  },
  swipeHintText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: { width: "100%", alignItems: "center", gap: 16 },
  modalImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  modalActions: { flexDirection: "row", gap: 10, width: "100%" },
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
  modalBtnDanger: { backgroundColor: "#e11d48", borderColor: "#e11d48" },
  modalBtnText: { color: Colors.text, fontWeight: "700", fontSize: 14 },
});
