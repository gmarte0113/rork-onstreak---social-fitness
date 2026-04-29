import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  AlertTriangle,
  Bell,
  Camera,
  Check,
  Flame,
  Lock,
  LogOut,
  MessageCircle,
  Share2,
  Sparkles,
  Trophy,
  Users,
  Pencil,
  X,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import AppBackground from "@/components/AppBackground";
import { GROUP_ICONS, MAX_GROUP_MEMBERS } from "@/constants/groupIcons";
import { toDateKey } from "@/constants/workouts";

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, sendNudge, leaveGroup, deleteGroup, setGroupIcon, canSendNudge, refreshGroupPhotos } = useApp();
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    refreshGroupPhotos().catch((e) => console.log("[group] refresh photos error", e));
  }, [refreshGroupPhotos]);
  const [iconPickerOpen, setIconPickerOpen] = useState<boolean>(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const accountabilityY = useRef<number>(0);
  const group = useMemo(
    () => state.groups.find((g) => g.id === id),
    [state.groups, id]
  );

  const today = toDateKey(new Date());

  const accountability = useMemo(() => {
    const list = group ? [...group.members] : [];
    list.sort((a, b) => {
      if (a.completedToday === b.completedToday) return 0;
      return a.completedToday ? -1 : 1;
    });
    return list;
  }, [group]);

  const todayPhotos = useMemo(
    () =>
      group
        ? state.workoutPhotos
            .filter((p) => p.groupId === group.id && p.date === today)
            .sort((a, b) => b.createdAt - a.createdAt)
        : [],
    [state.workoutPhotos, group, today]
  );

  if (!group) {
    return (
      <View style={styles.safe}>
        <AppBackground />
        <Stack.Screen options={{ title: "Group" }} />
        <Text style={styles.missing}>Group not found.</Text>
      </View>
    );
  }

  const isOwner = group.ownerId === state.userId;
  const selfCompletedToday = state.completedDates.includes(today);
  const doneToday = group.members.filter((m) => m.completedToday).length;
  const notDoneCount = group.members.length - doneToday;
  const groupStreak = group.streak;
  const memberSlots = MAX_GROUP_MEMBERS - group.members.length;

  const sorted = [...group.members].sort((a, b) => b.streak - a.streak);

  const onNudge = async (memberId: string, name: string) => {
    if (!selfCompletedToday) {
      Alert.alert(
        "Complete your workout first",
        "Only members who have finished today can nudge others."
      );
      return;
    }
    if (!canSendNudge(group.id, memberId)) {
      Alert.alert("Already nudged", `You already nudged ${name} today.`);
      return;
    }
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    sendNudge(group.id, memberId);
    Alert.alert("Nudge sent", `Your group is waiting on ${name}. Don't break the streak 🔥`);
  };

  const scrollToAccountability = () => {
    scrollRef.current?.scrollTo({ y: Math.max(0, accountabilityY.current - 20), animated: true });
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Join my OnStreak crew "${group.name}" with code ${group.code}.`,
      });
    } catch (e) {
      console.log("share", e);
    }
  };

  const confirmLeave = () => {
    if (isOwner) {
      setDeleteModalOpen(true);
      return;
    }
    Alert.alert("Leave group?", "You can rejoin with the code anytime.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          leaveGroup(group.id);
          router.replace("/(tabs)/social");
          setTimeout(() => {
            Alert.alert("You left the group");
          }, 300);
        },
      },
    ]);
  };

  const onConfirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      const ok = await deleteGroup(group.id);
      if (!ok) {
        Alert.alert("Something went wrong", "Please try again.");
        return;
      }
      setDeleteModalOpen(false);
      router.replace("/(tabs)/social");
      setTimeout(() => {
        Alert.alert("Group deleted");
      }, 300);
    } catch (e) {
      console.log("[group] delete error", e);
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.safe}>
      <AppBackground />
      <Stack.Screen options={{ title: group.name }} />
      <ScrollView contentContainerStyle={styles.scroll} ref={scrollRef}>
        <LinearGradient
          colors={["rgba(255,107,53,0.18)", "transparent"]}
          style={styles.hero}
        />

        {notDoneCount > 0 && (
          <TouchableOpacity
            onPress={scrollToAccountability}
            activeOpacity={0.85}
            style={styles.riskBanner}
            testID="streak-risk-banner"
          >
            <View style={styles.riskIcon}>
              <AlertTriangle color={Colors.danger} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.riskTitle}>Streak at risk</Text>
              <Text style={styles.riskSub}>
                {notDoneCount} {notDoneCount === 1 ? "member hasn’t" : "members haven’t"} completed today
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => isOwner && setIconPickerOpen(true)}
            activeOpacity={isOwner ? 0.7 : 1}
            disabled={!isOwner}
            testID="group-icon"
          >
            {group.icon ? (
              <Text style={styles.avatarEmoji}>{group.icon}</Text>
            ) : (
              <Users color={Colors.primary} size={24} />
            )}
            {isOwner && (
              <View style={styles.editBadge}>
                <Pencil color={Colors.text} size={10} />
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{group.name}</Text>
            <Text style={styles.meta}>
              {group.members.length}/{MAX_GROUP_MEMBERS} members
              {memberSlots > 0 ? ` · ${memberSlots} spot${memberSlots === 1 ? "" : "s"} left` : " · full"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={onShare}
            activeOpacity={0.85}
            testID="share-group"
          >
            <Share2 color={Colors.text} size={16} />
          </TouchableOpacity>
        </View>

        <View style={styles.codeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.codeLabel}>INVITE CODE</Text>
            <Text style={styles.codeVal}>{group.code}</Text>
          </View>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={onShare}
            testID="copy-code"
          >
            <Text style={styles.copyText}>Share link</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Trophy color={Colors.accent} size={16} />
            <Text style={styles.statValue}>{groupStreak}</Text>
            <Text style={styles.statLabel}>Group streak</Text>
          </View>
          <View style={styles.stat}>
            <Check color={Colors.success} size={16} />
            <Text style={styles.statValue}>
              {doneToday}/{group.members.length}
            </Text>
            <Text style={styles.statLabel}>Done today</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() =>
            router.push({ pathname: "/group/chat/[id]", params: { id: group.id } })
          }
          activeOpacity={0.85}
          testID="open-chat"
        >
          <MessageCircle color={Colors.primary} size={18} />
          <Text style={styles.chatText}>Open chat</Text>
        </TouchableOpacity>

        <View
          onLayout={(e) => {
            accountabilityY.current = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.sectionRow}>
            <Text style={styles.section}>TODAY’S ACCOUNTABILITY</Text>
            <Text style={styles.sectionRight}>
              {doneToday}/{group.members.length}
            </Text>
          </View>
          <View style={styles.card}>
            {accountability.map((m, idx) => {
              const alreadyNudged =
                !m.completedToday &&
                !m.isSelf &&
                state.nudges.some(
                  (n) =>
                    n.fromId === state.userId &&
                    n.toId === m.id &&
                    n.groupId === group.id &&
                    n.date === today
                );
              const canNudge =
                !m.completedToday &&
                !m.isSelf &&
                selfCompletedToday &&
                !alreadyNudged;
              return (
                <View
                  key={m.id}
                  style={[
                    styles.memberRow,
                    idx < accountability.length - 1 && styles.rowBorder,
                    m.isSelf && styles.selfRow,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: m.completedToday
                          ? Colors.success
                          : Colors.danger,
                      },
                    ]}
                  />
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {m.name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {m.name}
                      {m.isSelf ? " (you)" : ""}
                    </Text>
                    <Text
                      style={[
                        styles.memberStatus,
                        {
                          color: m.completedToday
                            ? Colors.success
                            : Colors.danger,
                        },
                      ]}
                    >
                      {m.completedToday ? "✅ Completed" : "❌ Not yet"}
                    </Text>
                  </View>
                  {m.completedToday ? (
                    <View style={styles.doneBadge}>
                      <Check color={Colors.success} size={12} strokeWidth={3} />
                    </View>
                  ) : canNudge ? (
                    <TouchableOpacity
                      onPress={() => onNudge(m.id, m.name)}
                      style={styles.nudgeBtn}
                      testID={`nudge-${m.id}`}
                      activeOpacity={0.85}
                    >
                      <Bell color={Colors.accent} size={12} />
                      <Text style={styles.nudgeText}>Nudge</Text>
                    </TouchableOpacity>
                  ) : alreadyNudged ? (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>Nudged</Text>
                    </View>
                  ) : !m.isSelf && !selfCompletedToday ? (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>—</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>Pending</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>TODAY’S PROOF FEED</Text>
          <Text style={styles.sectionRight}>{todayPhotos.length} posted</Text>
        </View>
        {todayPhotos.length === 0 ? (
          <View style={styles.feedEmpty}>
            <Camera color={Colors.textDim} size={22} />
            <Text style={styles.feedEmptyText}>
              No proof photos yet today. Be the first.
            </Text>
          </View>
        ) : (
          <View style={styles.feedGrid}>
            {todayPhotos.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.feedCard}
                activeOpacity={0.85}
                onPress={() => setViewerUri(p.uri)}
                testID={`feed-${p.id}`}
              >
                <Image
                  source={{ uri: p.uri }}
                  style={styles.feedImage}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.8)"]}
                  style={styles.feedOverlay}
                />
                <View style={styles.feedCaption}>
                  <Text style={styles.feedName} numberOfLines={1}>
                    {p.userName}
                  </Text>
                  <View style={styles.feedCheck}>
                    <Check color={Colors.success} size={10} strokeWidth={3} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.section}>LEADERBOARD</Text>
        <View style={styles.card}>
          {sorted.map((m, idx) => (
            <View
              key={m.id}
              style={[
                styles.memberRow,
                idx < sorted.length - 1 && styles.rowBorder,
                m.isSelf && styles.selfRow,
              ]}
            >
              <Text
                style={[
                  styles.rank,
                  idx < 3 && { color: Colors.accent },
                ]}
              >
                {idx + 1}
              </Text>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {m.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                  {m.name}
                  {m.isSelf ? " (you)" : ""}
                </Text>
                <View style={styles.memberMeta}>
                  <Flame color={Colors.primary} size={11} fill={Colors.primary} />
                  <Text style={styles.memberMetaText}>
                    {m.streak} day streak · {m.totalCompletions} total
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.leaveBtn}
          onPress={confirmLeave}
          activeOpacity={0.85}
          testID="leave-group"
        >
          <LogOut color={Colors.danger} size={16} />
          <Text style={styles.leaveText}>Leave group</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={!!viewerUri}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
      >
        <View style={styles.viewerWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewerUri(null)} />
          {viewerUri && (
            <Image
              source={{ uri: viewerUri }}
              style={styles.viewerImage}
              contentFit="contain"
            />
          )}
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerUri(null)}
            testID="close-viewer"
          >
            <X color={Colors.text} size={20} />
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        visible={deleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setDeleteModalOpen(false)}
      >
        <View style={styles.confirmWrap}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !isDeleting && setDeleteModalOpen(false)}
          />
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <AlertTriangle color={Colors.danger} size={22} />
            </View>
            <Text style={styles.confirmTitle}>Delete Group?</Text>
            <Text style={styles.confirmMessage}>
              You are the creator of this group. Leaving will permanently delete the group and all data for all members.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmCancel]}
                onPress={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
                activeOpacity={0.85}
                testID="cancel-delete-group"
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmDelete, isDeleting && styles.confirmDisabled]}
                onPress={onConfirmDelete}
                disabled={isDeleting}
                activeOpacity={0.85}
                testID="confirm-delete-group"
              >
                <Text style={styles.confirmDeleteText}>
                  {isDeleting ? "Deleting…" : "Delete Group"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <IconPickerModal
        visible={iconPickerOpen}
        current={group.icon}
        groupStreak={groupStreak}
        onClose={() => setIconPickerOpen(false)}
        onSelect={(icon) => {
          setGroupIcon(group.id, icon);
          setIconPickerOpen(false);
        }}
      />
    </View>
  );
}

function IconPickerModal({
  visible,
  current,
  groupStreak,
  onClose,
  onSelect,
}: {
  visible: boolean;
  current: string;
  groupStreak: number;
  onClose: () => void;
  onSelect: (icon: string) => void;
}) {
  const unlockedCount = GROUP_ICONS.filter((i) => groupStreak >= i.unlockAt).length;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Choose group icon</Text>
        <Text style={styles.sheetSub}>
          {unlockedCount}/{GROUP_ICONS.length} unlocked · Group streak: {groupStreak}
        </Text>
        <ScrollView
          style={{ maxHeight: 420 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconGrid}>
            {GROUP_ICONS.map((ic) => {
              const active = current === ic.emoji;
              const unlocked = groupStreak >= ic.unlockAt;
              return (
                <TouchableOpacity
                  key={ic.emoji}
                  style={[
                    styles.iconTile,
                    active && styles.iconTileActive,
                    !unlocked && styles.iconTileLocked,
                    ic.special && unlocked && styles.iconTileSpecial,
                  ]}
                  onPress={() => unlocked && onSelect(ic.emoji)}
                  activeOpacity={unlocked ? 0.8 : 1}
                  disabled={!unlocked}
                  testID={`icon-${ic.emoji}`}
                >
                  <Text
                    style={[
                      styles.iconTileEmoji,
                      !unlocked && { opacity: 0.3 },
                    ]}
                  >
                    {ic.emoji}
                  </Text>
                  {!unlocked && (
                    <View style={styles.lockOverlay}>
                      <Lock color={Colors.textMuted} size={12} />
                      <Text style={styles.lockText}>{ic.unlockAt}</Text>
                    </View>
                  )}
                  {ic.special && unlocked && (
                    <View style={styles.specialBadge}>
                      <Sparkles color={Colors.accent} size={10} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { padding: 20, paddingBottom: 60 },
  missing: { color: Colors.textMuted, padding: 40, textAlign: "center" },
  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 28 },
  editBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.bg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
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
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  iconTile: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconTileActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(255,107,53,0.1)",
  },
  iconTileLocked: {
    backgroundColor: Colors.surfaceElevated,
    borderStyle: "dashed",
  },
  iconTileSpecial: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255,182,39,0.08)",
  },
  iconTileEmoji: { fontSize: 28 },
  lockOverlay: {
    position: "absolute",
    bottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: Colors.bg,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
  },
  specialBadge: {
    position: "absolute",
    top: 3,
    right: 3,
  },
  sheetSub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: -8,
    marginBottom: 14,
  },
  name: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  meta: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  codeLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  codeVal: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 3,
    marginTop: 2,
  },
  copyBtn: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  copyText: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  stat: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  statValue: { color: Colors.text, fontSize: 20, fontWeight: "900" },
  statLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "600" },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  chatText: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  section: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  selfRow: {
    marginHorizontal: -14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,107,53,0.08)",
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rank: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "900",
    width: 20,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  memberName: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  memberMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  memberMetaText: { color: Colors.textMuted, fontSize: 11, fontWeight: "600" },
  doneBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  nudgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,182,39,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  nudgeText: { color: Colors.accent, fontSize: 11, fontWeight: "800" },
  pendingBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pendingText: { color: Colors.textDim, fontSize: 11, fontWeight: "700" },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 10,
  },
  leaveText: { color: Colors.danger, fontSize: 14, fontWeight: "700" },
  riskBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    marginBottom: 16,
  },
  riskIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(239,68,68,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  riskTitle: { color: Colors.danger, fontSize: 14, fontWeight: "900" },
  riskSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2, fontWeight: "600" },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionRight: {
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  memberStatus: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  feedEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.border,
    borderRadius: 14,
    gap: 8,
    marginBottom: 18,
  },
  feedEmptyText: { color: Colors.textMuted, fontSize: 12 },
  feedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  feedCard: {
    width: "48.5%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  feedImage: { width: "100%", height: "100%" },
  feedOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  feedCaption: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feedName: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  feedCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(34,197,94,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: { width: "100%", height: "80%" },
  confirmWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  confirmIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(239,68,68,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  confirmMessage: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancel: {
    backgroundColor: Colors.surfaceElevated,
  },
  confirmCancelText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  confirmDelete: {
    backgroundColor: Colors.danger,
  },
  confirmDeleteText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  viewerClose: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
