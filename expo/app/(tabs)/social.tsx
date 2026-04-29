import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
  Award,
  Bell,
  Camera,
  ChevronRight,
  Flame,
  Image as ImageIcon,
  Medal as MedalIcon,
  Plus,
  Share2,
  Sparkles,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { MEDALS, getMedal } from "@/constants/medals";
import { MAX_GROUP_MEMBERS } from "@/constants/groupIcons";
import { containsProfanity, getProfanityError } from "@/utils/profanity";
import {
  fetchGlobalIndividualLeaderboard,
  fetchGlobalGroupLeaderboard,
} from "@/lib/leaderboard";

const LEADERBOARD_TTL_MS = 24 * 60 * 60 * 1000;

export default function SocialScreen() {
  const { state, createGroup, joinGroup, refreshGroups, canCreateGroup, canJoinGroup, markCreateGroupInfoSeen, refreshGroupPhotos, isAuthReady } = useApp();
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [joinOpen, setJoinOpen] = useState<boolean>(false);
  const [createInfoOpen, setCreateInfoOpen] = useState<boolean>(false);
  const [joinInfoOpen, setJoinInfoOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [codeInput, setCodeInput] = useState<string>("");

  const earnedIds = useMemo(
    () => new Set(state.medals.map((m) => m.id)),
    [state.medals]
  );

  const individualQuery = useQuery({
    queryKey: ["leaderboard", "individuals"],
    queryFn: () => fetchGlobalIndividualLeaderboard(100),
    staleTime: LEADERBOARD_TTL_MS,
    refetchInterval: LEADERBOARD_TTL_MS,
    refetchOnWindowFocus: false,
  });

  const groupQuery = useQuery({
    queryKey: ["leaderboard", "groups"],
    queryFn: () => fetchGlobalGroupLeaderboard(100),
    staleTime: LEADERBOARD_TTL_MS,
    refetchInterval: LEADERBOARD_TTL_MS,
    refetchOnWindowFocus: false,
  });

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        individualQuery.refetch(),
        groupQuery.refetch(),
        refreshGroupPhotos(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [individualQuery, groupQuery, refreshGroupPhotos]);

  const globalIndividuals = useMemo(() => {
    const remote = individualQuery.data ?? [];
    const without = remote.filter((u) => u.id !== state.userId);
    const self = {
      id: state.userId,
      name: state.userName || "Athlete",
      streak: state.streak,
      total: state.completedDates.length,
    };
    const merged = [...without, self];
    merged.sort((a, b) => b.streak - a.streak || b.total - a.total);
    return merged.map((u) => ({ ...u, isSelf: u.id === state.userId }));
  }, [
    individualQuery.data,
    state.userId,
    state.userName,
    state.streak,
    state.completedDates.length,
  ]);

  const myIndividualRank = useMemo(
    () => globalIndividuals.findIndex((u) => u.isSelf) + 1,
    [globalIndividuals]
  );

  const globalGroups = useMemo(() => {
    const remote = groupQuery.data ?? [];
    const mineIds = new Set(state.groups.map((g) => g.id));
    const mineScores = new Map<string, number>(
      state.groups.map((g) => [g.id, g.members.reduce((s, m) => s + m.streak, 0)])
    );
    const remoteOthers = remote
      .filter((g) => !mineIds.has(g.id))
      .map((g) => ({ ...g, isMine: false }));
    const mineRows = state.groups.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      score: mineScores.get(g.id) ?? 0,
      size: g.members.length,
      isMine: true,
    }));
    const merged = [...remoteOthers, ...mineRows];
    merged.sort((a, b) => b.score - a.score);
    return merged;
  }, [groupQuery.data, state.groups]);

  const myGroupRank = useMemo(() => {
    if (state.groups.length === 0) return 0;
    const idx = globalGroups.findIndex((g) => g.isMine);
    return idx + 1;
  }, [globalGroups, state.groups.length]);

  const myGroup = useMemo(() => state.groups[0] ?? null, [state.groups]);

  const resetDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const candidates = [
      new Date(year, 0, 1),
      new Date(year, 3, 1),
      new Date(year, 8, 1),
      new Date(year + 1, 0, 1),
    ];
    const next = candidates.find((d) => d.getTime() > now.getTime()) ?? candidates[candidates.length - 1];
    return next.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }, []);

  const onCreate = async () => {
    if (!name.trim()) return;
    if (containsProfanity(name.trim())) {
      Alert.alert("Choose another name", getProfanityError("group"));
      return;
    }
    if (!canCreateGroup()) {
      setCreateOpen(false);
      setName("");
      router.push("/paywall");
      return;
    }
    const trimmed = name.trim();
    setName("");
    setCreateOpen(false);
    try {
      const g = await createGroup(trimmed);
      if (!g) {
        console.log("[social] Group creation failed: createGroup returned null");
        showToast("Failed to create group");
        return;
      }
      router.push({ pathname: "/group/[id]", params: { id: g.id } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("[social] create group error", msg);
      if (msg === "AUTH_NOT_READY") {
        showToast("Still loading account, please try again");
      } else {
        showToast("Failed to create group");
      }
    }
  };

  const [pendingCode, setPendingCode] = useState<string>("");
  const [joining, setJoining] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showToast = useCallback(
    (msg: string) => {
      setToast(msg);
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, 1800);
    },
    [toastOpacity]
  );

  useEffect(() => {
    return () => {
      toastOpacity.stopAnimation();
    };
  }, [toastOpacity]);

  const checkForRemovedGroups = useCallback(async () => {
    try {
      const res = await refreshGroups();
      if (res.removedGroups.length > 0) {
        console.log(
          "[social] removed groups detected",
          res.removedGroups.map((g) => g.id)
        );
        showToast(
          res.removedGroups.length === 1
            ? "This group no longer exists"
            : "Some groups no longer exist"
        );
      }
    } catch (e) {
      console.log("[social] focus refreshGroups error", e);
    }
  }, [refreshGroups, showToast]);

  useEffect(() => {
    checkForRemovedGroups();
  }, [checkForRemovedGroups]);

  useFocusEffect(
    useCallback(() => {
      checkForRemovedGroups();
      return () => {};
    }, [checkForRemovedGroups])
  );

  const onJoin = () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    if (!canJoinGroup()) {
      setJoinOpen(false);
      setCodeInput("");
      Alert.alert(
        "Upgrade to Pro",
        "Free accounts can only join 1 group. Upgrade to Pro to join multiple groups.",
        [
          { text: "Later", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/paywall") },
        ]
      );
      return;
    }
    setPendingCode(code);
    setCodeInput("");
    setJoinOpen(false);
    setTimeout(() => setJoinInfoOpen(true), Platform.OS === "ios" ? 350 : 0);
  };

  const onConfirmJoin = async () => {
    if (joining) return;
    const code = pendingCode.trim().toUpperCase();
    console.log("[social] onConfirmJoin start", { code });
    setJoinInfoOpen(false);
    if (!code) {
      Alert.alert("Invalid group code", "Please enter the invite code to join.");
      return;
    }
    setJoining(true);
    try {
      const timeout = new Promise<{ ok: false; reason: "error"; message: string }>(
        (resolve) =>
          setTimeout(
            () => resolve({ ok: false, reason: "error", message: "Request timed out. Check your connection and try again." }),
            15000
          )
      );
      const res = await Promise.race([joinGroup(code), timeout]);
      console.log("[social] joinGroup result", res.ok ? { ok: true, id: res.group.id } : res);
      setPendingCode("");
      if (res.ok) {
        try {
          await refreshGroups();
        } catch (e) {
          console.log("[social] refreshGroups error", e);
        }
        showToast("Joined group successfully");
        const targetId = res.group.id;
        setTimeout(() => {
          router.push({ pathname: "/group/[id]", params: { id: targetId } });
        }, 400);
        return;
      }
      if (res.reason === "full") {
        Alert.alert(
          "Group full",
          `This group already has ${MAX_GROUP_MEMBERS} members.`
        );
      } else if (res.reason === "not_found") {
        Alert.alert("Invalid group code", "We couldn't find a group with that code. Double-check and try again.");
      } else if (res.reason === "empty") {
        Alert.alert("Invalid group code", "Please enter the invite code to join.");
      } else {
        Alert.alert(
          "Couldn't join group",
          res.message ?? "Please try again in a moment."
        );
      }
    } catch (e) {
      console.log("[social] join group error", e);
      Alert.alert("Couldn't join group", "Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const onPressCreate = () => {
    if (!canCreateGroup()) {
      Alert.alert(
        "Pro required",
        "Creating groups is a Pro feature. Upgrade to rally your crew.",
        [
          { text: "Later", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/paywall") },
        ]
      );
      return;
    }
    if (!state.hasSeenCreateGroupInfo) {
      setCreateInfoOpen(true);
      return;
    }
    setCreateOpen(true);
  };

  const onContinueCreateInfo = () => {
    markCreateGroupInfoSeen();
    setCreateInfoOpen(false);
    setCreateOpen(true);
  };

  const onPressJoin = () => {
    if (!canJoinGroup()) {
      Alert.alert(
        "Upgrade to Pro",
        "Free accounts can only join 1 group. Upgrade to Pro to join multiple groups.",
        [
          { text: "Later", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/paywall") },
        ]
      );
      return;
    }
    setJoinOpen(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <Text style={styles.title}>Social</Text>

        <TouchableOpacity
          style={styles.recapCard}
          onPress={() => router.push("/recap/global")}
          activeOpacity={0.85}
          testID="open-global-recap"
        >
          <LinearGradient
            colors={["rgba(255,107,53,0.2)", "rgba(255,182,39,0.1)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.recapIcon}>
            <TrendingUp color={Colors.accent} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recapLabel}>30-DAY RECAP</Text>
            <Text style={styles.recapTitle}>See your month in numbers</Text>
          </View>
          <ChevronRight color={Colors.textMuted} size={18} />
        </TouchableOpacity>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>MEDALS</Text>
          <Text style={styles.sectionRight}>
            {state.medals.length}/{MEDALS.length}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.medalsScroll}
        >
          {MEDALS.map((m) => {
            const earned = earnedIds.has(m.id);
            return (
              <View
                key={m.id}
                style={[
                  styles.medalCard,
                  earned && { borderColor: m.color },
                ]}
              >
                <View
                  style={[
                    styles.medalCircle,
                    { backgroundColor: earned ? m.bg : Colors.surfaceElevated },
                  ]}
                >
                  <Award
                    color={earned ? m.color : Colors.textDim}
                    size={28}
                    strokeWidth={2.2}
                  />
                </View>
                <Text
                  style={[
                    styles.medalName,
                    !earned && { color: Colors.textDim },
                  ]}
                  numberOfLines={2}
                >
                  {m.title}
                </Text>
                {!earned && <Text style={styles.medalLock}>Locked</Text>}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>GROUPS</Text>
        </View>

        <View style={styles.groupActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onPressCreate}
            activeOpacity={0.85}
            testID="create-group-btn"
          >
            <View style={[styles.actionIcon, { backgroundColor: "rgba(255,107,53,0.15)" }]}>
              <Plus color={Colors.primary} size={18} />
            </View>
            <Text style={styles.actionText}>Create group</Text>
            {!state.isPremium && (
              <View style={styles.proTag}>
                <Text style={styles.proTagText}>PRO</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onPressJoin}
            activeOpacity={0.85}
            testID="join-group-btn"
          >
            <View style={[styles.actionIcon, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
              <UserPlus color={Colors.success} size={18} />
            </View>
            <Text style={styles.actionText}>Join group</Text>
          </TouchableOpacity>
        </View>

        {state.groups.filter((g) => Boolean(g && g.id)).length === 0 ? (
          <View style={styles.empty}>
            <Users color={Colors.textDim} size={28} />
            <Text style={styles.emptyText}>
              No groups yet. Start one with friends.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginBottom: 20 }}>
            {state.groups.filter((g) => Boolean(g && g.id)).map((g) => {
              const doneToday = g.members.filter((m) => m.completedToday).length;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={styles.groupCard}
                  onPress={() =>
                    router.push({ pathname: "/group/[id]", params: { id: g.id } })
                  }
                  activeOpacity={0.85}
                  testID={`group-${g.id}`}
                >
                  <View style={styles.groupAvatar}>
                    {g.icon ? (
                      <Text style={styles.groupAvatarEmoji}>{g.icon}</Text>
                    ) : (
                      <Users color={Colors.primary} size={20} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupName}>{g.name}</Text>
                    <Text style={styles.groupMeta}>
                      {g.members.length}/{MAX_GROUP_MEMBERS} members · {doneToday} done today
                    </Text>
                  </View>
                  <View style={styles.codePill}>
                    <Text style={styles.codeText}>{g.code}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.section}>GLOBAL INDIVIDUAL</Text>
          <Text style={styles.sectionRight}>Resets {resetDate}</Text>
        </View>
        {myIndividualRank > 0 && (
          <View style={styles.rankPill}>
            <Text style={styles.rankPillLabel}>Your rank</Text>
            <Text style={styles.rankPillValue}>#{myIndividualRank}</Text>
            <Text style={styles.rankPillHint}>of {globalIndividuals.length}</Text>
          </View>
        )}
        <View style={styles.leaderCard}>
          {globalIndividuals.length <= 1 ? (
            <View style={styles.leaderEmpty}>
              <Text style={styles.leaderEmptyText}>
                The leaderboard is just getting started. Keep stacking streaks to climb as more people join.
              </Text>
            </View>
          ) : (
            <View style={styles.leaderScrollWrap}>
              <ScrollView
                style={styles.leaderScroll}
                contentContainerStyle={styles.leaderScrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                testID="individual-leaderboard-scroll"
              >
                {globalIndividuals.slice(0, 100).map((u, idx, arr) => (
                  <View
                    key={u.id}
                    style={[
                      styles.leaderRow,
                      idx < arr.length - 1 && styles.rowBorder,
                      u.isSelf && styles.leaderSelf,
                    ]}
                  >
                    <Text style={[styles.leaderRank, idx < 3 && { color: Colors.accent }]}>
                      {idx + 1}
                    </Text>
                    <Text style={[styles.leaderName, u.isSelf && { color: Colors.primary }]}>
                      {u.name}
                      {u.isSelf ? " (you)" : ""}
                    </Text>
                    <View style={styles.leaderStat}>
                      <Flame color={Colors.primary} size={12} fill={Colors.primary} />
                      <Text style={styles.leaderStatText}>{u.streak}</Text>
                    </View>
                    <View style={styles.leaderStat}>
                      <MedalIcon color={Colors.accent} size={12} />
                      <Text style={styles.leaderStatText}>{u.total}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(0,0,0,0)", Colors.surface]}
                style={styles.leaderFade}
              />
            </View>
          )}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>GLOBAL GROUP</Text>
          <Text style={styles.sectionRight}>Resets {resetDate}</Text>
        </View>
        {myGroupRank > 0 && (
          <View style={styles.rankPill}>
            <Text style={styles.rankPillLabel}>Your group&apos;s rank</Text>
            <Text style={styles.rankPillValue}>#{myGroupRank}</Text>
            <Text style={styles.rankPillHint}>of {globalGroups.length}</Text>
          </View>
        )}
        <View style={styles.leaderCard}>
          {globalGroups.length === 0 ? (
            <View style={styles.leaderEmpty}>
              <Text style={styles.leaderEmptyText}>
                No groups on the board yet. Create or join one to start competing.
              </Text>
            </View>
          ) : (
            <View style={styles.leaderScrollWrap}>
              <ScrollView
                style={styles.leaderScroll}
                contentContainerStyle={styles.leaderScrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                testID="group-leaderboard-scroll"
              >
                {globalGroups.slice(0, 100).map((g, idx, arr) => (
                  <View
                    key={g.id}
                    style={[
                      styles.leaderRow,
                      idx < arr.length - 1 && styles.rowBorder,
                      g.isMine && styles.leaderSelf,
                    ]}
                  >
                    <Text style={[styles.leaderRank, idx < 3 && { color: Colors.accent }]}>
                      {idx + 1}
                    </Text>
                    <Text style={styles.groupIconSmall}>{g.icon}</Text>
                    <Text style={[styles.leaderName, g.isMine && { color: Colors.primary }]}>
                      {g.name}
                      {g.isMine ? " (yours)" : ""}
                    </Text>
                    <View style={styles.leaderStat}>
                      <Trophy color={Colors.accent} size={12} />
                      <Text style={styles.leaderStatText}>{g.score}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(0,0,0,0)", Colors.surface]}
                style={styles.leaderFade}
              />
            </View>
          )}
        </View>

        {myGroup && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>MY GROUP — {myGroup.name.toUpperCase()}</Text>
            </View>
            <View style={styles.card}>
              {[...myGroup.members]
                .sort((a, b) => b.streak - a.streak)
                .map((m, idx, arr) => (
                  <View
                    key={m.id}
                    style={[
                      styles.leaderRow,
                      idx < arr.length - 1 && styles.rowBorder,
                      m.isSelf && styles.leaderSelf,
                    ]}
                  >
                    <Text
                      style={[
                        styles.leaderRank,
                        idx < 3 && { color: Colors.accent },
                      ]}
                    >
                      {idx + 1}
                    </Text>
                    <Text
                      style={[
                        styles.leaderName,
                        m.isSelf && { color: Colors.primary },
                      ]}
                    >
                      {m.name}
                      {m.isSelf ? " (you)" : ""}
                    </Text>
                    <View style={styles.leaderStat}>
                      <Flame
                        color={Colors.primary}
                        size={12}
                        fill={Colors.primary}
                      />
                      <Text style={styles.leaderStatText}>{m.streak}</Text>
                    </View>
                  </View>
                ))}
            </View>
          </>
        )}
      </ScrollView>

      <InputModal
        visible={createOpen}
        title="Create a group"
        placeholder="Crew name"
        value={name}
        onChange={setName}
        onCancel={() => setCreateOpen(false)}
        onSubmit={onCreate}
        submitLabel="Create"
      />
      <InputModal
        visible={joinOpen}
        title="Join with code"
        placeholder="INVITE CODE"
        value={codeInput}
        onChange={(v) => setCodeInput(v.toUpperCase())}
        onCancel={() => setJoinOpen(false)}
        onSubmit={onJoin}
        submitLabel="Continue"
        uppercase
      />

      <AckModal
        visible={createInfoOpen}
        title="How Groups Work"
        bullets={[
          { icon: <UserPlus color={Colors.primary} size={18} />, text: "Invite friends to join your group" },
          { icon: <Bell color={Colors.accent} size={18} />, text: "Keep each other accountable with daily tracking and nudges" },
          { icon: <Camera color={Colors.primary} size={18} />, text: "Submitting a workout requires a photo (camera only, no gallery)" },
          { icon: <Share2 color={Colors.accent} size={18} />, text: "Your photo is shared with all group members" },
          { icon: <Sparkles color={Colors.primary} size={18} />, text: "Earn team streaks and unlock achievements together" },
        ]}
        primaryLabel="Continue"
        onPrimary={onContinueCreateInfo}
        secondaryLabel="Cancel"
        onSecondary={() => setCreateInfoOpen(false)}
      />

      {joining && (
        <Modal visible transparent animationType="fade">
          <View style={styles.loadingWrap}>
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.loadingText}>Joining group…</Text>
            </View>
          </View>
        </Modal>
      )}

      {toast && (
        <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      <AckModal
        visible={joinInfoOpen}
        title="Joining a Group"
        bullets={[
          { icon: <Camera color={Colors.primary} size={18} />, text: "You must take a photo to complete each workout (camera only, no uploads)" },
          { icon: <ImageIcon color={Colors.accent} size={18} />, text: "Your photo will be shared with the group" },
          { icon: <Bell color={Colors.primary} size={18} />, text: "Group members can track your progress and nudge you if you miss a day" },
          { icon: <Sparkles color={Colors.accent} size={18} />, text: "You contribute to team streaks and unlocks" },
        ]}
        primaryLabel={joining ? "Joining\u2026" : "Join Group"}
        onPrimary={onConfirmJoin}
        secondaryLabel="Cancel"
        onSecondary={() => {
          setJoinInfoOpen(false);
          setPendingCode("");
        }}
      />
    </SafeAreaView>
  );
}

function AckModal({
  visible,
  title,
  bullets,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  visible: boolean;
  title: string;
  bullets: { icon: React.ReactNode; text: string }[];
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.centerWrap}>
        <View style={styles.backdrop} />
        <View style={styles.ackCard}>
          <Text style={styles.ackTitle}>{title}</Text>
          <View style={styles.bulletList}>
            {bullets.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletIcon}>{b.icon}</View>
                <Text style={styles.bulletText}>{b.text}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.ackPrimary}
            onPress={onPrimary}
            activeOpacity={0.85}
            testID={`ack-primary-${primaryLabel.toLowerCase().replace(/\s/g, "-")}`}
          >
            <Text style={styles.ackPrimaryText}>{primaryLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ackSecondary}
            onPress={onSecondary}
            activeOpacity={0.85}
          >
            <Text style={styles.ackSecondaryText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function InputModal({
  visible,
  title,
  placeholder,
  value,
  onChange,
  onCancel,
  onSubmit,
  submitLabel,
  uppercase,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  uppercase?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.centerWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={styles.centerCard}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TextInput
            style={[styles.input, uppercase && { letterSpacing: 4, textAlign: "center" }]}
            placeholder={placeholder}
            placeholderTextColor={Colors.textDim}
            value={value}
            onChangeText={onChange}
            autoFocus
            autoCapitalize={uppercase ? "characters" : "words"}
            testID={`input-${submitLabel.toLowerCase()}`}
          />
          <View style={styles.centerActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={onSubmit}
              activeOpacity={0.85}
              testID={`submit-${submitLabel.toLowerCase()}`}
            >
              <Text style={styles.submitText}>{submitLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { padding: 20, paddingBottom: 120 },
  title: {
    color: Colors.text,
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 20,
  },
  recapCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  recapIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,182,39,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  recapLabel: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  recapTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  section: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  sectionRight: {
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: "700",
  },
  medalsScroll: { gap: 10, paddingRight: 20, marginBottom: 24 },
  medalCard: {
    width: 110,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  medalCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  medalName: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  medalLock: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: "700",
  },
  groupActions: { flexDirection: "row", gap: 10, marginBottom: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: Colors.text, fontSize: 14, fontWeight: "700", flex: 1 },
  actionBtnDisabled: { opacity: 0.6 },
  proTag: {
    backgroundColor: "rgba(255,182,39,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proTagText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    padding: 32,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: 16,
    marginBottom: 20,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  groupMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  codePill: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  codeText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  leaderCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  leaderScrollWrap: {
    position: "relative",
  },
  leaderScroll: {
    maxHeight: 460,
  },
  leaderScrollContent: {
    paddingHorizontal: 14,
  },
  leaderFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  leaderSelf: {
    marginHorizontal: -14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,107,53,0.08)",
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  leaderRank: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: "900",
    width: 22,
  },
  leaderName: { color: Colors.text, fontSize: 14, fontWeight: "700", flex: 1 },
  leaderStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.surfaceElevated,
  },
  leaderStatText: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  groupIconSmall: { fontSize: 18 },
  leaderEmpty: { paddingVertical: 20, paddingHorizontal: 4 },
  leaderEmptyText: { color: Colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: "center" },
  groupAvatarEmoji: { fontSize: 22 },
  rankPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,107,53,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.3)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  rankPillLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  rankPillValue: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  rankPillHint: {
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: "700",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  centerCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: Colors.bg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  centerActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelText: { color: Colors.textMuted, fontSize: 15, fontWeight: "800" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  sheetTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitText: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  ackCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.bg,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ackTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginBottom: 18,
  },
  bulletList: {
    gap: 14,
    marginBottom: 22,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bulletIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  bulletText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    paddingTop: 6,
  },
  ackPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  ackPrimaryText: { color: Colors.text, fontSize: 15, fontWeight: "900" },
  ackSecondary: {
    paddingVertical: 12,
    alignItems: "center",
  },
  ackSecondaryText: { color: Colors.textMuted, fontSize: 14, fontWeight: "700" },
  loadingWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingCard: {
    backgroundColor: Colors.bg,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 36,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 200,
  },
  loadingText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  toast: {
    position: "absolute",
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  toastText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
});
