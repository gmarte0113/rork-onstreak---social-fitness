import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { MANAGE_SUBSCRIPTION_URL, PRIVACY_URL, TERMS_URL } from "@/constants/legal";
import {
  Bell,
  Clock,
  Dumbbell,
  Heart,
  Activity,
  RotateCcw,
  Target,
  Scale,
  User,
  Zap,
  ChevronRight,
  Check,
  Crown,
  Info,
  ShieldCheck,
  Trash2,
  ExternalLink,
  FileText,
  MessageSquare,
  Shield,
  Wrench,
  Flame,
  Award,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useApp } from "@/providers/AppProvider";
import { MEDALS } from "@/constants/medals";
import type { FitnessLevel, Goal } from "@/constants/workouts";
import type { WeightUnit } from "@/providers/AppProvider";
import {
  validateDisplayName,
  daysUntilNameChangeAvailable,
  canChangeDisplayName,
  NAME_CHANGE_COOLDOWN_MESSAGE,
  DISPLAY_NAME_MAX,
} from "@/utils/displayName";

const GOAL_OPTIONS: {
  id: Goal;
  title: string;
  desc: string;
  icon: React.ComponentType<{ color: string; size: number }>;
}[] = [
  { id: "lose_weight", title: "Lose weight", desc: "Burn calories, feel light", icon: Heart },
  { id: "build_muscle", title: "Build muscle", desc: "Strength without the gym", icon: Dumbbell },
  { id: "stay_active", title: "Stay active", desc: "Daily movement, daily wins", icon: Activity },
];

const LEVEL_OPTIONS: { id: FitnessLevel; title: string; desc: string }[] = [
  { id: "beginner", title: "Beginner", desc: "I'm just getting started" },
  { id: "intermediate", title: "Intermediate", desc: "I work out sometimes" },
];

export default function SettingsScreen() {
  const {
    state,
    setReminderTime,
    setNotificationsEnabled,
    setGoal,
    setLevel,
    setWeightUnit,
    updateDisplayName,
    resetAll,
    deleteAccount,
    setDevMode,
    devSetStreak,
    devToggleMedal,
  } = useApp();
  const [devMedalsOpen, setDevMedalsOpen] = useState<boolean>(false);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [notif, setNotif] = useState<boolean>(state.notificationsEnabled);
  const [notifBusy, setNotifBusy] = useState<boolean>(false);

  React.useEffect(() => {
    setNotif(state.notificationsEnabled);
  }, [state.notificationsEnabled]);

  const onToggleNotif = async (value: boolean) => {
    if (notifBusy) return;
    setNotif(value);
    setNotifBusy(true);
    try {
      const ok = await setNotificationsEnabled(value);
      if (value && !ok) {
        setNotif(false);
        Alert.alert(
          "Notifications disabled",
          Platform.OS === "web"
            ? "Push notifications aren't available on web. Open OnStreak on your phone to enable daily reminders."
            : "We couldn't schedule your reminder. Enable notifications for OnStreak in your device settings and try again."
        );
      }
    } finally {
      setNotifBusy(false);
    }
  };
  const [goalOpen, setGoalOpen] = useState<boolean>(false);
  const [levelOpen, setLevelOpen] = useState<boolean>(false);
  const [timeOpen, setTimeOpen] = useState<boolean>(false);
  const [nameOpen, setNameOpen] = useState<boolean>(false);
  const [skipInfoOpen, setSkipInfoOpen] = useState<boolean>(false);

  const confirmReset = () => {
    Alert.alert(
      "Sign out & clear local data?",
      "This signs you out on this device and clears cached progress, preferences, and photos stored locally. Your account and synced data remain on the server.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => {
            resetAll();
            router.replace("/onboarding");
          },
        },
      ]
    );
  };

  const openManageSubscription = async () => {
    try {
      await Linking.openURL(MANAGE_SUBSCRIPTION_URL);
    } catch (e) {
      console.log("[settings] open manage subscription error", e);
      Alert.alert(
        "Could not open",
        "Open the App Store app, then tap your profile → Subscriptions to manage OnStreak Pro."
      );
    }
  };

  const reminderStr = useMemo(() => {
    const h24 = state.reminderHour;
    const m = state.reminderMinute ?? 0;
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }, [state.reminderHour, state.reminderMinute]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Settings" variant="bar" />
      <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.section}>PROFILE</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => setNameOpen(true)}
          activeOpacity={0.7}
          testID="edit-name"
        >
          <View style={styles.iconWrap}>
            <User color={Colors.primary} size={18} />
          </View>
          <Text style={styles.rowLabel}>Name</Text>
          <Text style={styles.rowValue} numberOfLines={1}>
            {state.userName || "Set name"}
          </Text>
          <ChevronRight color={Colors.textDim} size={16} />
        </TouchableOpacity>
        <Divider />
        <TouchableOpacity
          style={styles.row}
          onPress={() => setGoalOpen(true)}
          activeOpacity={0.7}
          testID="edit-goal"
        >
          <View style={styles.iconWrap}>
            <Target color={Colors.primary} size={18} />
          </View>
          <Text style={styles.rowLabel}>Goal</Text>
          <Text style={styles.rowValue}>{formatGoal(state.goal)}</Text>
          <ChevronRight color={Colors.textDim} size={16} />
        </TouchableOpacity>
        <Divider />
        <TouchableOpacity
          style={styles.row}
          onPress={() => setLevelOpen(true)}
          activeOpacity={0.7}
          testID="edit-level"
        >
          <View style={styles.iconWrap}>
            <Zap color={Colors.primary} size={18} />
          </View>
          <Text style={styles.rowLabel}>Fitness level</Text>
          <Text style={styles.rowValue}>{formatLevel(state.level)}</Text>
          <ChevronRight color={Colors.textDim} size={16} />
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>PREFERENCES</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Scale color={Colors.primary} size={18} />
          </View>
          <Text style={styles.rowLabel}>Weight units</Text>
          <View style={styles.segment}>
            {(["kg", "lb"] as const).map((u) => {
              const active = state.weightUnit === u;
              return (
                <TouchableOpacity
                  key={u}
                  onPress={() => setWeightUnit(u)}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  testID={`unit-${u}`}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      active && styles.segmentTextActive,
                    ]}
                  >
                    {u.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={styles.section}>REMINDERS</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Bell color={Colors.primary} size={18} />
          </View>
          <Text style={styles.rowLabel}>Daily reminder</Text>
          <Switch
            value={notif}
            onValueChange={onToggleNotif}
            disabled={notifBusy}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Platform.OS === "android" ? Colors.text : undefined}
            testID="notif-toggle"
          />
        </View>
        <Divider />
        <TouchableOpacity
          style={styles.row}
          onPress={() => setTimeOpen(true)}
          activeOpacity={0.7}
          testID="edit-reminder-time"
        >
          <View style={styles.iconWrap}>
            <Clock color={Colors.primary} size={18} />
          </View>
          <Text style={styles.rowLabel}>Remind me at</Text>
          <Text style={styles.rowValue}>{reminderStr}</Text>
          <ChevronRight color={Colors.textDim} size={16} />
        </TouchableOpacity>
        <Text style={styles.hint}>
          &ldquo;Your 3-minute workout is waiting.&rdquo;
        </Text>
      </View>

      {state.isPremium && (
        <>
          <Text style={styles.section}>SUBSCRIPTION</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Crown color={Colors.primary} size={18} />
              </View>
              <Text style={styles.rowLabel}>Plan</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>
            <Divider />
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <ShieldCheck color={Colors.primary} size={18} />
              </View>
              <Text style={styles.rowLabel}>Skip tokens</Text>
              <TouchableOpacity
                onPress={() => setSkipInfoOpen(true)}
                hitSlop={10}
                style={styles.infoBtn}
                testID="skip-info-btn"
                activeOpacity={0.7}
              >
                <Info color={Colors.textMuted} size={16} />
              </TouchableOpacity>
              <View style={styles.tokenBadge}>
                <Text style={styles.tokenBadgeText}>
                  {state.skipUsedThisWeek ? "0" : "1"}/1
                </Text>
              </View>
            </View>
            <Divider />
            <TouchableOpacity
              style={styles.row}
              onPress={openManageSubscription}
              activeOpacity={0.7}
              testID="manage-subscription"
            >
              <View style={styles.iconWrap}>
                <ExternalLink color={Colors.primary} size={18} />
              </View>
              <Text style={styles.rowLabel}>Manage subscription</Text>
              <Text style={styles.rowValue}>App Store</Text>
              <ChevronRight color={Colors.textDim} size={16} />
            </TouchableOpacity>
          </View>
        </>
      )}

      <Text style={styles.section}>FEEDBACK</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => Linking.openURL("https://onstreak.userjot.com/").catch(() => {})}
          activeOpacity={0.7}
          testID="provide-feedback"
        >
          <View style={styles.iconWrap}>
            <MessageSquare color={Colors.primary} size={18} />
          </View>
          <Text style={styles.rowLabel}>Provide feedback</Text>
          <ExternalLink color={Colors.textDim} size={16} />
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>LEGAL</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}
          activeOpacity={0.7}
          testID="open-terms"
        >
          <View style={styles.iconWrap}>
            <FileText color={Colors.primary} size={18} />
          </View>
          <Text style={styles.rowLabel}>Terms of Use (EULA)</Text>
          <ChevronRight color={Colors.textDim} size={16} />
        </TouchableOpacity>
        <Divider />
        <TouchableOpacity
          style={styles.row}
          onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
          activeOpacity={0.7}
          testID="open-privacy"
        >
          <View style={styles.iconWrap}>
            <Shield color={Colors.primary} size={18} />
          </View>
          <Text style={styles.rowLabel}>Privacy Policy</Text>
          <ChevronRight color={Colors.textDim} size={16} />
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>DATA</Text>
      <TouchableOpacity
        style={styles.dangerBtn}
        onPress={confirmReset}
        activeOpacity={0.85}
        testID="reset-btn"
      >
        <RotateCcw color={Colors.danger} size={18} />
        <Text style={styles.dangerText}>Sign out & clear local data</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <>
          <Text style={styles.section}>DEVELOPER</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Wrench color={Colors.primary} size={18} />
              </View>
              <Text style={styles.rowLabel}>Dev mode</Text>
              <Switch
                value={state.isDevMode}
                onValueChange={setDevMode}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Platform.OS === "android" ? Colors.text : undefined}
                testID="dev-mode-toggle"
              />
            </View>
            {state.isDevMode && (
              <>
                <Divider />
                <View style={[styles.row, { flexDirection: "column", alignItems: "flex-start", gap: 10 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "stretch" }}>
                    <View style={styles.iconWrap}>
                      <Flame color={Colors.primary} size={18} />
                    </View>
                    <Text style={styles.rowLabel}>Override streak</Text>
                    <Text style={styles.rowValue}>{state.streak}</Text>
                  </View>
                  <View style={styles.devPresetRow}>
                    {[0, 1, 7, 14, 30, 90].map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.devPresetBtn,
                          state.streak === s && styles.devPresetBtnActive,
                        ]}
                        onPress={() => devSetStreak(s)}
                        activeOpacity={0.85}
                        testID={`dev-streak-${s}`}
                      >
                        <Text
                          style={[
                            styles.devPresetText,
                            state.streak === s && styles.devPresetTextActive,
                          ]}
                        >
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Divider />
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => setDevMedalsOpen(true)}
                  activeOpacity={0.7}
                  testID="dev-medals-btn"
                >
                  <View style={styles.iconWrap}>
                    <Award color={Colors.primary} size={18} />
                  </View>
                  <Text style={styles.rowLabel}>Toggle medals</Text>
                  <Text style={styles.rowValue}>
                    {state.medals.length}/{MEDALS.length}
                  </Text>
                  <ChevronRight color={Colors.textDim} size={16} />
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={styles.deleteHint}>
            Dev tools are visible only in development builds. Production users are unaffected.
          </Text>
        </>
      )}

      <Text style={styles.section}>ACCOUNT</Text>
      <TouchableOpacity
        style={[styles.dangerBtn, { borderColor: "rgba(239,68,68,0.4)" }]}
        onPress={() => setDeleteOpen(true)}
        activeOpacity={0.85}
        testID="delete-account-btn"
        disabled={deleting}
      >
        <Trash2 color={Colors.danger} size={18} />
        <Text style={styles.dangerText}>Delete account</Text>
      </TouchableOpacity>
      <Text style={styles.deleteHint}>
        Permanently removes your account and all associated data. This cannot be undone.
      </Text>

      <GoalModal
        visible={goalOpen}
        current={state.goal}
        onClose={() => setGoalOpen(false)}
        onSelect={(g) => {
          setGoal(g);
          setGoalOpen(false);
        }}
      />
      <LevelModal
        visible={levelOpen}
        current={state.level}
        onClose={() => setLevelOpen(false)}
        onSelect={(l) => {
          setLevel(l);
          setLevelOpen(false);
        }}
      />
      <TimeModal
        visible={timeOpen}
        hour={state.reminderHour}
        minute={state.reminderMinute ?? 0}
        onClose={() => setTimeOpen(false)}
        onSave={(h, m) => {
          setReminderTime(h, m);
          setTimeOpen(false);
        }}
      />
      <SkipInfoModal
        visible={skipInfoOpen}
        onClose={() => setSkipInfoOpen(false)}
      />
      <DeleteAccountModal
        visible={deleteOpen}
        busy={deleting}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={async () => {
          if (deleting) return;
          setDeleting(true);
          const res = await deleteAccount();
          setDeleting(false);
          setDeleteOpen(false);
          if (!res.ok) {
            Alert.alert(
              "Could not delete account",
              res.error ?? "Please try again."
            );
            return;
          }
          router.replace("/onboarding");
        }}
      />
      <DevMedalsModal
        visible={devMedalsOpen}
        earnedIds={state.medals.map((m) => m.id)}
        onClose={() => setDevMedalsOpen(false)}
        onToggle={devToggleMedal}
      />
      <NameModal
        visible={nameOpen}
        current={state.userName}
        lastNameChangeAt={state.lastNameChangeAt}
        onClose={() => setNameOpen(false)}
        onSave={async (n) => {
          const res = await updateDisplayName(n);
          if (!res.ok) {
            Alert.alert("Couldn’t update name", res.error ?? "Please try again.");
            return { ok: false, error: res.error };
          }
          setNameOpen(false);
          Alert.alert("Name updated", "Your display name has been updated.");
          return { ok: true };
        }}
      />
    </ScrollView>
    </View>
  );
}

function GoalModal({
  visible,
  current,
  onClose,
  onSelect,
}: {
  visible: boolean;
  current: Goal | null;
  onClose: () => void;
  onSelect: (g: Goal) => void;
}) {
  return (
    <SheetModal visible={visible} onClose={onClose} title="Your goal">
      <View style={{ gap: 10 }}>
        {GOAL_OPTIONS.map((g) => {
          const Icon = g.icon;
          const active = current === g.id;
          return (
            <TouchableOpacity
              key={g.id}
              style={[styles.optionCard, active && styles.optionSelected]}
              onPress={() => onSelect(g.id)}
              activeOpacity={0.85}
              testID={`select-goal-${g.id}`}
            >
              <View style={styles.optionIcon}>
                <Icon color={Colors.primary} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{g.title}</Text>
                <Text style={styles.optionDesc}>{g.desc}</Text>
              </View>
              {active && <Check color={Colors.primary} size={20} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SheetModal>
  );
}

function LevelModal({
  visible,
  current,
  onClose,
  onSelect,
}: {
  visible: boolean;
  current: FitnessLevel | null;
  onClose: () => void;
  onSelect: (l: FitnessLevel) => void;
}) {
  return (
    <SheetModal visible={visible} onClose={onClose} title="Fitness level">
      <View style={{ gap: 10 }}>
        {LEVEL_OPTIONS.map((l) => {
          const active = current === l.id;
          return (
            <TouchableOpacity
              key={l.id}
              style={[styles.optionCard, active && styles.optionSelected]}
              onPress={() => onSelect(l.id)}
              activeOpacity={0.85}
              testID={`select-level-${l.id}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{l.title}</Text>
                <Text style={styles.optionDesc}>{l.desc}</Text>
              </View>
              {active && <Check color={Colors.primary} size={20} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SheetModal>
  );
}

function TimeModal({
  visible,
  hour,
  minute,
  onClose,
  onSave,
}: {
  visible: boolean;
  hour: number;
  minute: number;
  onClose: () => void;
  onSave: (h: number, m: number) => void;
}) {
  const initial12 = hour % 12 === 0 ? 12 : hour % 12;
  const initialPeriod: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
  const [hStr, setHStr] = useState<string>(String(initial12));
  const [mStr, setMStr] = useState<string>(String(minute).padStart(2, "0"));
  const [period, setPeriod] = useState<"AM" | "PM">(initialPeriod);

  React.useEffect(() => {
    if (visible) {
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      setHStr(String(h12));
      setMStr(String(minute).padStart(2, "0"));
      setPeriod(hour >= 12 ? "PM" : "AM");
    }
  }, [visible, hour, minute]);

  const save = () => {
    const h12 = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (!Number.isFinite(h12) || h12 < 1 || h12 > 12) {
      Alert.alert("Invalid hour", "Enter 1–12.");
      return;
    }
    if (!Number.isFinite(m) || m < 0 || m > 59) {
      Alert.alert("Invalid minute", "Enter 0–59.");
      return;
    }
    let h24 = h12 % 12;
    if (period === "PM") h24 += 12;
    onSave(h24, m);
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title="Reminder time">
      <Text style={styles.timeHint}>Pick a time for your daily nudge.</Text>
      <View style={styles.timeRow}>
        <TextInput
          value={hStr}
          onChangeText={(v) => setHStr(v.replace(/[^0-9]/g, "").slice(0, 2))}
          keyboardType="number-pad"
          style={styles.timeInput}
          maxLength={2}
          placeholder="H"
          placeholderTextColor={Colors.textDim}
          testID="reminder-hour-input"
          selectTextOnFocus
        />
        <Text style={styles.timeColon}>:</Text>
        <TextInput
          value={mStr}
          onChangeText={(v) => setMStr(v.replace(/[^0-9]/g, "").slice(0, 2))}
          keyboardType="number-pad"
          style={styles.timeInput}
          maxLength={2}
          placeholder="MM"
          placeholderTextColor={Colors.textDim}
          testID="reminder-minute-input"
          selectTextOnFocus
        />
      </View>
      <View style={styles.periodRow}>
        {(["AM", "PM"] as const).map((p) => {
          const active = period === p;
          return (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, active && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.85}
              testID={`period-${p}`}
            >
              <Text
                style={[
                  styles.periodText,
                  active && styles.periodTextActive,
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={save}
        activeOpacity={0.85}
        testID="save-reminder-time"
      >
        <Text style={styles.saveBtnText}>Save time</Text>
      </TouchableOpacity>
    </SheetModal>
  );
}

function NameModal({
  visible,
  current,
  lastNameChangeAt,
  onClose,
  onSave,
}: {
  visible: boolean;
  current: string;
  lastNameChangeAt: string | null;
  onClose: () => void;
  onSave: (name: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [name, setName] = useState<string>(current);
  const [submitting, setSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (visible) {
      setName(current);
      setSubmitting(false);
    }
  }, [visible, current]);

  const trimmed = name.trim();
  const sameAsCurrent = trimmed === current.trim();
  const cooldownDays = useMemo(
    () => daysUntilNameChangeAvailable(lastNameChangeAt),
    [lastNameChangeAt]
  );
  const cooldownActive = !sameAsCurrent && !canChangeDisplayName(lastNameChangeAt);

  const validation = useMemo(() => {
    if (trimmed.length === 0) {
      return { valid: false as const, error: null as string | null };
    }
    const v = validateDisplayName(trimmed);
    if (v.valid) return { valid: true as const, error: null };
    return { valid: false as const, error: v.error };
  }, [trimmed]);

  const inlineError: string | null = cooldownActive
    ? `${NAME_CHANGE_COOLDOWN_MESSAGE} Try again in ${cooldownDays} day${cooldownDays === 1 ? "" : "s"}.`
    : validation.error;

  const canSave = !submitting && !sameAsCurrent && validation.valid && !cooldownActive;

  const submit = async () => {
    if (!canSave) return;
    setSubmitting(true);
    const res = await onSave(trimmed);
    if (!res.ok) {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.centerWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.centerCard}>
          <Text style={styles.sheetTitle}>Display name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.nameInput}
            placeholder="Your name"
            placeholderTextColor={Colors.textDim}
            autoFocus
            autoCapitalize="words"
            maxLength={DISPLAY_NAME_MAX}
            returnKeyType="done"
            onSubmitEditing={submit}
            editable={!submitting}
            testID="name-edit-input"
          />
          {inlineError ? (
            <Text style={styles.nameError} testID="name-error">
              {inlineError}
            </Text>
          ) : (
            <Text style={styles.nameHelp}>
              2–20 characters. You can change this once every 30 days.
            </Text>
          )}
          <View style={styles.centerActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.85}
              disabled={submitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { flex: 1, opacity: canSave ? 1 : 0.5 }]}
              onPress={submit}
              activeOpacity={0.85}
              disabled={!canSave}
              testID="save-name"
            >
              <Text style={styles.saveBtnText}>
                {submitting ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DeleteAccountModal({
  visible,
  busy,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centerWrap}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.centerCard}>
          <View style={styles.cancelIconWrap}>
            <Trash2 color={Colors.danger} size={28} />
          </View>
          <Text style={styles.cancelTitle}>Delete account?</Text>
          <Text style={styles.cancelBody}>
            This permanently deletes your account, progress, weights, photos, and streak.
            {"\n\n"}
            This action cannot be undone.
          </Text>
          <View style={styles.centerActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.85}
              disabled={busy}
              testID="cancel-delete-account"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmCancelBtn, { flex: 1, opacity: busy ? 0.6 : 1 }]}
              onPress={onConfirm}
              activeOpacity={0.85}
              disabled={busy}
              testID="confirm-delete-account"
            >
              <Text style={styles.confirmCancelText}>
                {busy ? "Deleting…" : "Delete permanently"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SkipInfoModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centerWrap}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.centerCard}>
          <View style={styles.skipIconWrap}>
            <ShieldCheck color={Colors.primary} size={32} />
          </View>
          <Text style={styles.cancelTitle}>About skip tokens</Text>
          <Text style={styles.cancelBody}>
            Pro members get 1 skip token per week. Use it to save your personal streak if you miss a day.
            {"\n\n"}
            Tokens only apply to your personal streak — they do not protect group streaks. If anyone in your group misses a day, the group streak resets to zero.
          </Text>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={onClose}
            activeOpacity={0.85}
            testID="skip-info-close"
          >
            <Text style={styles.saveBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function DevMedalsModal({
  visible,
  earnedIds,
  onClose,
  onToggle,
}: {
  visible: boolean;
  earnedIds: string[];
  onClose: () => void;
  onToggle: (id: string) => void;
}) {
  const earnedSet = useMemo(() => new Set(earnedIds), [earnedIds]);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { maxHeight: "85%" }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Toggle medals</Text>
        <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ gap: 8 }}>
          {MEDALS.map((m) => {
            const earned = earnedSet.has(m.id);
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.devMedalRow, earned && styles.devMedalRowActive]}
                onPress={() => onToggle(m.id)}
                activeOpacity={0.85}
                testID={`dev-medal-${m.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.devMedalTitle} numberOfLines={1}>
                    {m.title}
                  </Text>
                  <Text style={styles.devMedalSub} numberOfLines={1}>
                    {m.id}
                  </Text>
                </View>
                <View
                  style={[
                    styles.devMedalBadge,
                    earned && styles.devMedalBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.devMedalBadgeText,
                      earned && styles.devMedalBadgeTextActive,
                    ]}
                  >
                    {earned ? "UNLOCKED" : "LOCKED"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity
          style={[styles.saveBtn, { marginTop: 16 }]}
          onPress={onClose}
          activeOpacity={0.85}
          testID="dev-medals-close"
        >
          <Text style={styles.saveBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function SheetModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
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
        <Text style={styles.sheetTitle}>{title}</Text>
        {children}
      </View>
    </Modal>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function formatGoal(g: string | null): string {
  if (g === "lose_weight") return "Lose weight";
  if (g === "build_muscle") return "Build muscle";
  if (g === "stay_active") return "Stay active";
  return "—";
}
function formatLevel(l: string | null): string {
  if (l === "beginner") return "Beginner";
  if (l === "intermediate") return "Intermediate";
  return "—";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 60 },
  section: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 10,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: "600" },
  rowValue: { color: Colors.textMuted, fontSize: 14, fontWeight: "600" },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 60 },
  segment: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: "rgba(255,107,53,0.18)",
  },
  segmentText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  segmentTextActive: { color: Colors.primary },
  hint: {
    color: Colors.textDim,
    fontSize: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    fontStyle: "italic",
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
  },
  dangerText: { color: Colors.danger, fontSize: 15, fontWeight: "700" },
  deleteHint: {
    color: Colors.textDim,
    fontSize: 12,
    marginTop: 8,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  footer: {
    color: Colors.textDim,
    fontSize: 12,
    textAlign: "center",
    marginTop: 28,
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
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(255,107,53,0.08)",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { color: Colors.text, fontSize: 16, fontWeight: "700" },
  optionDesc: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  timeHint: {
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  timeInput: {
    color: Colors.text,
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -1,
    textAlign: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    width: 110,
  },
  timeColon: {
    color: Colors.text,
    fontSize: 48,
    fontWeight: "800",
  },
  periodRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
  },
  periodBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(255,107,53,0.12)",
  },
  periodText: {
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  periodTextActive: { color: Colors.primary },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  nameError: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: "600",
    marginTop: -8,
    marginBottom: 14,
    textAlign: "center",
  },
  nameHelp: {
    color: Colors.textDim,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 14,
    textAlign: "center",
  },
  nameInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
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
  iconWrapDanger: {
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  proBadge: {
    backgroundColor: "rgba(255,107,53,0.18)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  proBadgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  skipIconWrap: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tokenBadgeText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cancelIconWrap: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239,68,68,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  cancelTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  cancelBody: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  confirmCancelBtn: {
    backgroundColor: Colors.danger,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmCancelText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  devPresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingLeft: 46,
  },
  devPresetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  devPresetBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(255,107,53,0.18)",
  },
  devPresetText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  devPresetTextActive: {
    color: Colors.primary,
  },
  devMedalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
  },
  devMedalRowActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(255,107,53,0.08)",
  },
  devMedalTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  devMedalSub: {
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  devMedalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
  },
  devMedalBadgeActive: {
    backgroundColor: "rgba(255,107,53,0.18)",
  },
  devMedalBadgeText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  devMedalBadgeTextActive: {
    color: Colors.primary,
  },
});
