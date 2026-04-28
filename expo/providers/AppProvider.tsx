import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  supabase,
  PROFILES_TABLE,
  WEIGHT_LOGS_TABLE,
  PROGRESS_PHOTOS_TABLE,
  isSupabaseConfigured,
  ensureAnonymousSession,
  getLastAuthError,
  uploadPhoto,
  safeGetSession,
  safeGetUser,
} from "@/lib/supabase";
import {
  FitnessLevel,
  Goal,
  dayOfYear,
  getTodayWorkout,
  toDateKey,
} from "@/constants/workouts";
import { MedalId, streakMedalsEarned, programMedalId, PERSONAL_PLAN_MEDAL_ID } from "@/constants/medals";
import { getProgram } from "@/constants/programs";
import {
  FocusArea,
  PlanDay,
  PLAN_DURATION_DAYS,
  buildPersonalizedPlan,
  planName,
} from "@/constants/personalizedPlan";
import {
  cancelDailyReminder,
  cancelWeeklyWeightReminder,
  configureNotificationHandler,
  scheduleDailyReminder,
  scheduleWeeklyWeightReminder,
  registerForPushNotificationsAsync,
  savePushTokenToProfile,
  fetchUserPushToken,
  sendExpoPushNotification,
} from "@/lib/notifications";
import { initPurchases, getIsPro, isPurchasesSupported } from "@/lib/purchases";
import {
  createGroupRemote,
  joinGroupRemote,
  leaveGroupRemote,
  deleteGroupRemote,
  fetchUserGroups,
  updateGroupIconRemote,
  updateMemberCompletionRemote,
  updateGroupStreakRemote,
  computeAndUpdateGroupStreakRemote,
  insertGroupPhotoRemote,
  fetchGroupPhotosRemote,
} from "@/lib/groups";
import { MAX_GROUP_MEMBERS } from "@/constants/groupIcons";

const STORAGE_KEY = "@lazyfit/state/v2";

export type WeightUnit = "kg" | "lb";
export type WeightEntry = { date: string; weightKg: number; photoUri?: string; createdAt?: number };
export type PhotoEntry = { date: string; uri: string };

export type ProgramProgress = {
  currentDay: number;
  completedDays: number[];
  lastCompletedDate: string | null;
  streak: number;
};

export type PersonalizedPlan = {
  focusAreas: FocusArea[];
  startedAt: string;
  currentDay: number;
  completedDays: number[];
  lastCompletedDate: string | null;
};

export type Enrollment =
  | { kind: "plan" }
  | { kind: "program"; programId: string };

export type EarnedMedal = {
  id: MedalId;
  earnedAt: string;
  meta?: { programId?: string; streak?: number };
};

export type GroupMember = {
  id: string;
  name: string;
  streak: number;
  completedToday: boolean;
  totalCompletions: number;
  isSelf?: boolean;
};

export type WorkoutPhoto = {
  id: string;
  userId: string;
  userName: string;
  groupId: string;
  date: string;
  uri: string;
  createdAt: number;
};

export type NudgeRecord = {
  fromId: string;
  toId: string;
  groupId: string;
  at: number;
  date: string;
};

export type GroupMessage = {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
};

export type Group = {
  id: string;
  name: string;
  code: string;
  createdAt: number;
  icon: string;
  ownerId: string;
  members: GroupMember[];
  joinedAt: string;
  streak: number;
  lastSuccessDate: string | null;
  lastResetDate: string | null;
};

export type Attempts = "first" | "2-3" | "4-6" | "7+";
export type Blocker = "time" | "motivation" | "soreness" | "boredom" | "life";
export type PlanSelected = "annual" | "monthly" | "free" | null;
export type NotificationPrefs = {
  dailyReminder: boolean;
  streakRescue: boolean;
  milestones: boolean;
};

export type AppState = {
  onboarded: boolean;
  userId: string;
  userName: string;
  goal: Goal | null;
  level: FitnessLevel | null;
  attempts: Attempts | null;
  blockers: Blocker[];
  planSelected: PlanSelected;
  notificationPrefs: NotificationPrefs;
  streak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  completedDates: string[];
  reminderHour: number;
  reminderMinute: number;
  weightUnit: WeightUnit;
  weights: WeightEntry[];
  beforePhoto: PhotoEntry | null;
  afterPhoto: PhotoEntry | null;
  isPremium: boolean;
  programs: Record<string, ProgramProgress>;
  totalReps: number;
  totalMinutes: number;
  medals: EarnedMedal[];
  groups: Group[];
  messages: GroupMessage[];
  nudges: NudgeRecord[];
  workoutPhotos: WorkoutPhoto[];
  skipWeekStart: string | null;
  skipUsedThisWeek: boolean;
  lastSkipUsedAt: string | null;
  personalizedPlan: PersonalizedPlan | null;
  activeEnrollment: Enrollment | null;
  hasSeenCreateGroupInfo: boolean;
  notificationsEnabled: boolean;
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
function code(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const DEFAULT_STATE: AppState = {
  onboarded: false,
  userId: uid(),
  userName: "",
  goal: null,
  level: null,
  streak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
  completedDates: [],
  reminderHour: 7,
  reminderMinute: 0,
  attempts: null,
  blockers: [],
  planSelected: null,
  notificationPrefs: { dailyReminder: true, streakRescue: true, milestones: true },
  weightUnit: "lb",
  weights: [],
  beforePhoto: null,
  afterPhoto: null,
  isPremium: false,
  programs: {},
  totalReps: 0,
  totalMinutes: 0,
  medals: [],
  groups: [],
  messages: [],
  nudges: [],
  workoutPhotos: [],
  skipWeekStart: null,
  skipUsedThisWeek: false,
  lastSkipUsedAt: null,
  personalizedPlan: null,
  activeEnrollment: null,
  hasSeenCreateGroupInfo: false,
  notificationsEnabled: false,
};

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  const diff = db.getTime() - da.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function parseReps(reps: string): number {
  const lower = reps.toLowerCase();
  if (
    lower.includes("sec") ||
    lower.includes("min") ||
    lower.includes("hold") ||
    lower.includes("hr") ||
    lower.includes("hour") ||
    /\d+\s*:\s*\d+/.test(lower)
  ) {
    return 0;
  }
  const m = reps.match(/(\d+)/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  if (lower.includes("each")) return n * 2;
  return n;
}

export const [AppProvider, useApp] = createContextHook(() => {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [pendingMedal, setPendingMedal] = useState<EarnedMedal | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  const loadQuery = useQuery({
    queryKey: ["app-state"],
    queryFn: async (): Promise<AppState> => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_STATE;
        const parsed = JSON.parse(raw) as Partial<AppState>;
        return { ...DEFAULT_STATE, ...parsed };
      } catch (e) {
        console.log("[AppProvider] load error", e);
        return DEFAULT_STATE;
      }
    },
  });

  useEffect(() => {
    if (loadQuery.data && !hydrated) {
      setState(loadQuery.data);
      setHydrated(true);
    }
  }, [loadQuery.data, hydrated]);

  const stateRef = useRef<AppState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let mounted = true;
    const applyUid = (uid: string | null) => {
      if (!mounted || !uid) return;
      setSupabaseUserId((prev) => (prev === uid ? prev : uid));
      setState((prev) => {
        if (prev.userId === uid) return prev;
        const next = { ...prev, userId: uid };
        stateRef.current = next;
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) =>
          console.log("[AppProvider] save uid error", e)
        );
        return next;
      });
    };
    (async () => {
      if (!isSupabaseConfigured) return;
      try {
        const { userId: existing } = await safeGetSession();
        if (existing) applyUid(existing);
      } catch (e) {
        console.log("[AppProvider] get existing session error", e);
      }
    })();
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AppProvider] auth state change", event, session?.user?.id);
      const uid = session?.user?.id ?? null;
      if (uid) {
        applyUid(uid);
      } else if (event === "SIGNED_OUT") {
        setSupabaseUserId(null);
      }
    });
    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, []);

  const hydrateFromSupabase = useCallback(async (uid: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const [weightsRes, photosRes, profileRes] = await Promise.all([
        supabase
          .from(WEIGHT_LOGS_TABLE)
          .select("date, weight_kg")
          .eq("user_id", uid)
          .order("date", { ascending: true }),
        supabase
          .from(PROGRESS_PHOTOS_TABLE)
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from(PROFILES_TABLE)
          .select("name, goal, level, weight_unit")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);
      const profile = profileRes.data as { name: string | null; goal: string | null; level: string | null; weight_unit: string | null } | null;
      if (weightsRes.error) console.log("[AppProvider] fetch weights error", weightsRes.error.message);
      if (photosRes.error) console.log("[AppProvider] fetch photos error", photosRes.error.message);
      const weights: WeightEntry[] = (weightsRes.data ?? []).map((r: { date: string; weight_kg: number }) => ({
        date: r.date,
        weightKg: Number(r.weight_kg),
      }));
      const photoRows = (photosRes.data ?? []) as { kind: "before" | "after"; date: string; url?: string | null; photo_url?: string | null; path?: string | null }[];
      const resolveUri = async (p: { url?: string | null; photo_url?: string | null; path?: string | null }): Promise<string | null> => {
        if (p.path) {
          try {
            const { data: signed, error: signErr } = await supabase.storage
              .from("progress-photos")
              .createSignedUrl(p.path, 60 * 60 * 24 * 7);
            if (!signErr && signed?.signedUrl) return signed.signedUrl;
          } catch (e) {
            console.log("[AppProvider] signed url error", e);
          }
          const { data } = supabase.storage.from("progress-photos").getPublicUrl(p.path);
          if (data.publicUrl) return data.publicUrl;
        }
        if (p.url) return p.url;
        if (p.photo_url) return p.photo_url;
        return null;
      };
      const before = photoRows.find((p) => p.kind === "before") ?? null;
      const after = photoRows.find((p) => p.kind === "after") ?? null;
      const beforeUri = before ? await resolveUri(before) : null;
      const afterUri = after ? await resolveUri(after) : null;
      setState((prev) => {
        const profileName = profile?.name?.trim() ?? "";
        const profileGoal = (profile?.goal as Goal | null) ?? null;
        const profileLevel = (profile?.level as FitnessLevel | null) ?? null;
        const profileUnit = (profile?.weight_unit as WeightUnit | null) ?? null;
        const hasCompleteProfile = Boolean(profileName && profileGoal && profileLevel);
        const next: AppState = {
          ...prev,
          userName: prev.userName || profileName,
          goal: prev.goal ?? profileGoal,
          level: prev.level ?? profileLevel,
          weightUnit: profileUnit ?? prev.weightUnit,
          onboarded: prev.onboarded || hasCompleteProfile,
          weights: weights.length > 0 ? weights : prev.weights,
          beforePhoto: before && beforeUri ? { date: before.date, uri: beforeUri } : prev.beforePhoto,
          afterPhoto: after && afterUri ? { date: after.date, uri: afterUri } : prev.afterPhoto,
        };
        stateRef.current = next;
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    } catch (e) {
      console.log("[AppProvider] hydrateFromSupabase exception", e);
    }
  }, []);

  useEffect(() => {
    if (supabaseUserId && hydrated) {
      hydrateFromSupabase(supabaseUserId);
      (async () => {
        try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
            await savePushTokenToProfile(supabaseUserId, token);
          }
        } catch (e) {
          console.log("[AppProvider] register push token error", e);
        }
      })();
      (async () => {
        try {
          const remoteGroups = await fetchUserGroups(supabaseUserId);
          if (remoteGroups !== null) {
            setState((prev) => {
              const remoteIds = new Set(remoteGroups.map((g) => g.id));
              const byId = new Map<string, Group>();
              for (const g of prev.groups) {
                if (remoteIds.has(g.id)) byId.set(g.id, g);
              }
              for (const g of remoteGroups) byId.set(g.id, g);
              const merged = Array.from(byId.values());
              const next = { ...prev, groups: merged };
              stateRef.current = next;
              AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
              return next;
            });
          }
          const groupIds = stateRef.current.groups.map((g) => g.id);
          if (groupIds.length > 0) {
            const remotePhotos = await fetchGroupPhotosRemote(groupIds);
            if (remotePhotos.length > 0) {
              setState((prev) => {
                const map = new Map<string, WorkoutPhoto>();
                for (const p of prev.workoutPhotos) map.set(`${p.groupId}:${p.userId}:${p.date}`, p);
                for (const r of remotePhotos) {
                  map.set(`${r.groupId}:${r.userId}:${r.date}`, {
                    id: r.id,
                    userId: r.userId,
                    userName: r.userName,
                    groupId: r.groupId,
                    date: r.date,
                    uri: r.uri,
                    createdAt: r.createdAt,
                  });
                }
                const next = { ...prev, workoutPhotos: Array.from(map.values()) };
                stateRef.current = next;
                AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
                return next;
              });
            }
          }
        } catch (e) {
          console.log("[AppProvider] sync groups error", e);
        }
      })();
    }
  }, [supabaseUserId, hydrated, hydrateFromSupabase]);

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncToSupabase = useCallback((s: AppState) => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        if (!isSupabaseConfigured) return;
        const { userId: uid } = await safeGetSession();
        if (!uid) {
          console.log("[AppProvider] skip sync, no auth session yet");
          return;
        }
        const payload = {
          user_id: uid,
          name: s.userName || null,
          goal: s.goal,
          level: s.level,
          weight_unit: s.weightUnit,
          streak: s.streak,
          longest_streak: s.longestStreak,
          completed_dates: s.completedDates,
          total_reps: s.totalReps,
          total_minutes: s.totalMinutes,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from(PROFILES_TABLE)
          .upsert(payload, { onConflict: "user_id" });
        if (error) console.log("[AppProvider] supabase profile sync error", error.message);
      } catch (e) {
        console.log("[AppProvider] supabase sync exception", e);
      }
    }, 800);
  }, []);

  const persist = useCallback(
    (updater: (prev: AppState) => AppState) => {
      const next = updater(stateRef.current);
      if (next === stateRef.current) return;
      stateRef.current = next;
      setState(next);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) => {
        console.log("[AppProvider] save error", e);
      });
      syncToSupabase(next);
    },
    [syncToSupabase]
  );

  const awardMedalIfNew = useCallback(
    (
      prev: AppState,
      id: MedalId,
      meta?: EarnedMedal["meta"]
    ): AppState => {
      const key = id + (meta?.programId ? `:${meta.programId}` : "");
      const existing = prev.medals.find(
        (m) => m.id + (m.meta?.programId ? `:${m.meta.programId}` : "") === key
      );
      if (existing) return prev;
      const earned: EarnedMedal = {
        id,
        earnedAt: toDateKey(new Date()),
        meta,
      };
      setTimeout(() => setPendingMedal(earned), 300);
      return { ...prev, medals: [...prev.medals, earned] };
    },
    []
  );

  const checkStreakMedals = useCallback(
    (prev: AppState, nextStreak: number): AppState => {
      const ids = streakMedalsEarned(nextStreak);
      let out = prev;
      for (const id of ids) {
        out = awardMedalIfNew(out, id, { streak: nextStreak });
      }
      return out;
    },
    [awardMedalIfNew]
  );

  const completeOnboarding = useCallback(
    (goal: Goal, level: FitnessLevel) => {
      persist((prev) => ({ ...prev, onboarded: true, goal, level }));
    },
    [persist]
  );

  const saveOnboardingAnswers = useCallback(
    (answers: {
      name?: string;
      attempts?: Attempts | null;
      blockers?: Blocker[];
      goal?: Goal | null;
      level?: FitnessLevel | null;
      notificationPrefs?: NotificationPrefs;
      planSelected?: PlanSelected;
    }) => {
      persist((prev) => ({
        ...prev,
        userName: answers.name ?? prev.userName,
        attempts: answers.attempts === undefined ? prev.attempts : answers.attempts,
        blockers: answers.blockers ?? prev.blockers,
        goal: answers.goal === undefined ? prev.goal : answers.goal,
        level: answers.level === undefined ? prev.level : answers.level,
        notificationPrefs: answers.notificationPrefs ?? prev.notificationPrefs,
        planSelected: answers.planSelected === undefined ? prev.planSelected : answers.planSelected,
      }));
    },
    [persist]
  );

  const completeTodaysWorkout = useCallback(
    (stats?: { reps: number; minutes: number }) => {
      persist((prev) => {
        const today = toDateKey(new Date());
        if (prev.completedDates.includes(today)) return prev;
        let nextStreak = 1;
        if (prev.lastCompletedDate) {
          const diff = daysBetween(prev.lastCompletedDate, today);
          if (diff === 1) nextStreak = prev.streak + 1;
          else if (diff === 0) nextStreak = prev.streak;
        }
        let out: AppState = {
          ...prev,
          streak: nextStreak,
          longestStreak: Math.max(prev.longestStreak, nextStreak),
          lastCompletedDate: today,
          completedDates: [...prev.completedDates, today],
          totalReps: prev.totalReps + (stats?.reps ?? 0),
          totalMinutes: prev.totalMinutes + (stats?.minutes ?? 0),
        };
        out = checkStreakMedals(out, nextStreak);
        return out;
      });
    },
    [persist, checkStreakMedals]
  );

  const checkStreakReset = useCallback(() => {
    persist((prev) => {
      const today = toDateKey(new Date());
      let next = prev;
      if (
        next.skipWeekStart &&
        daysBetween(next.skipWeekStart, today) >= 7
      ) {
        next = {
          ...next,
          skipWeekStart: today,
          skipUsedThisWeek: false,
        };
      } else if (!next.skipWeekStart) {
        next = { ...next, skipWeekStart: today };
      }

      if (next.groups.length > 0) {
        const updatedGroups = next.groups.map((g) => {
          if (g.lastResetDate === today) return g;
          let streak = g.streak;
          if (g.lastSuccessDate) {
            const gap = daysBetween(g.lastSuccessDate, today);
            if (gap > 1) streak = 0;
          } else if (g.streak > 0) {
            streak = 0;
          }
          return {
            ...g,
            streak,
            lastResetDate: today,
            members: g.members.map((m) => ({ ...m, completedToday: false })),
          };
        });
        next = { ...next, groups: updatedGroups };
      }

      if (next.workoutPhotos.length > 0) {
        const filtered = next.workoutPhotos.filter((p) => p.date === today);
        if (filtered.length !== next.workoutPhotos.length) {
          next = { ...next, workoutPhotos: filtered };
        }
      }

      if (!next.lastCompletedDate) return next;
      const diff = daysBetween(next.lastCompletedDate, today);
      if (diff > 1 && next.streak !== 0) {
        if (next.isPremium && !next.skipUsedThisWeek && diff === 2) {
          next = {
            ...next,
            lastCompletedDate: today,
            skipUsedThisWeek: true,
            lastSkipUsedAt: today,
          };
          return next;
        }
        return { ...next, streak: 0 };
      }
      return next;
    });
  }, [persist]);

  useEffect(() => {
    if (hydrated) checkStreakReset();
  }, [hydrated, checkStreakReset]);

  useEffect(() => {
    configureNotificationHandler().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isPurchasesSupported) return;
    let cancelled = false;
    (async () => {
      const ok = await initPurchases(supabaseUserId ?? undefined);
      if (!ok || cancelled) return;
      try {
        const isPro = await getIsPro();
        if (cancelled) return;
        setState((prev) => (prev.isPremium === isPro ? prev : { ...prev, isPremium: isPro }));
      } catch (e) {
        console.log("[AppProvider] getIsPro error", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseUserId]);

  useEffect(() => {
    if (!hydrated) return;
    if (!state.notificationsEnabled) {
      cancelWeeklyWeightReminder().catch(() => {});
      return;
    }
    scheduleDailyReminder(
      state.reminderHour,
      state.reminderMinute ?? 0
    ).catch((e) => console.log("[AppProvider] reschedule error", e));
    scheduleWeeklyWeightReminder().catch((e) =>
      console.log("[AppProvider] weekly weight schedule error", e)
    );
  }, [
    hydrated,
    state.notificationsEnabled,
    state.reminderHour,
    state.reminderMinute,
  ]);

  const logWeight = useCallback(
    (weightKg: number, photoUri?: string) => {
      const date = toDateKey(new Date());
      persist((prev) => ({
        ...prev,
        weights: [
          ...prev.weights,
          { date, weightKg, photoUri, createdAt: Date.now() },
        ],
      }));
      (async () => {
        try {
          if (!isSupabaseConfigured) return;
          let uid: string | null = await safeGetUser();
          if (!uid) {
            uid = await ensureAnonymousSession();
          }
          console.log("[AppProvider] logWeight auth user", uid);
          if (!uid) {
            const authErr = getLastAuthError();
            Alert.alert(
              "Not signed in",
              `Could not create a Supabase session. ${authErr ?? "Enable Anonymous Sign-ins in Supabase \u2192 Authentication \u2192 Providers."}`
            );
            return;
          }
          const { data: inserted, error } = await supabase
            .from(WEIGHT_LOGS_TABLE)
            .insert({ user_id: uid, date, weight_kg: weightKg, weight: weightKg })
            .select();
          if (error) {
            console.log("[AppProvider] weight insert error", error);
            Alert.alert("Weight save failed", `${error.message}${error.details ? `\n${error.details}` : ""}${error.hint ? `\n${error.hint}` : ""}`);
            return;
          }
          console.log("[AppProvider] weight logged to supabase", inserted);
          await hydrateFromSupabase(uid);
        } catch (e) {
          console.log("[AppProvider] logWeight remote exception", e);
        }
      })();
    },
    [persist, hydrateFromSupabase]
  );

  const setPhoto = useCallback(
    (which: "before" | "after", uri: string) => {
      const dateKey = toDateKey(new Date());
      persist((prev) => ({
        ...prev,
        [which === "before" ? "beforePhoto" : "afterPhoto"]: {
          date: dateKey,
          uri,
        },
      }));
      (async () => {
        try {
          if (!isSupabaseConfigured) return;
          let uid: string | null = await safeGetUser();
          if (!uid) {
            uid = await ensureAnonymousSession();
          }
          console.log("[AppProvider] setPhoto auth user", uid);
          if (!uid) {
            const authErr = getLastAuthError();
            Alert.alert(
              "Not signed in",
              `Could not create a Supabase session. ${authErr ?? "Enable Anonymous Sign-ins in Supabase \u2192 Authentication \u2192 Providers."}`
            );
            return;
          }
          const uploaded = await uploadPhoto(uid, which, uri);
          if (!uploaded) {
            Alert.alert("Photo upload failed", "Could not upload image to storage. Check bucket 'progress-photos' and its policies.");
            return;
          }
          const { data: inserted, error } = await supabase
            .from(PROGRESS_PHOTOS_TABLE)
            .insert({ user_id: uid, kind: which, date: dateKey, path: uploaded.path, url: uploaded.url, photo_url: uploaded.url })
            .select();
          if (error) {
            console.log("[AppProvider] photo metadata insert error", error);
            Alert.alert("Photo save failed", `${error.message}${error.details ? `\n${error.details}` : ""}${error.hint ? `\n${error.hint}` : ""}`);
            return;
          }
          console.log("[AppProvider] photo saved to supabase", inserted);
        } catch (e) {
          console.log("[AppProvider] photo upload failed", e);
        }
      })();
    },
    [persist, hydrateFromSupabase]
  );

  const deletePhoto = useCallback(
    (which: "before" | "after") => {
      persist((prev) => ({
        ...prev,
        [which === "before" ? "beforePhoto" : "afterPhoto"]: null,
      }));
      (async () => {
        try {
          if (!isSupabaseConfigured) return;
          const uid = await safeGetUser();
          if (!uid) return;
          const { error } = await supabase
            .from(PROGRESS_PHOTOS_TABLE)
            .delete()
            .eq("user_id", uid)
            .eq("kind", which);
          if (error) {
            console.log("[AppProvider] photo delete error", error.message);
            return;
          }
          console.log("[AppProvider] photo deleted from supabase", which);
        } catch (e) {
          console.log("[AppProvider] deletePhoto exception", e);
        }
      })();
    },
    [persist]
  );

  const setReminderHour = useCallback(
    (hour: number) => {
      persist((prev) => ({ ...prev, reminderHour: hour }));
    },
    [persist]
  );

  const setReminderTime = useCallback(
    (hour: number, minute: number) => {
      persist((prev) => ({
        ...prev,
        reminderHour: hour,
        reminderMinute: minute,
      }));
    },
    [persist]
  );

  const setNotificationsEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (enabled) {
        const ok = await scheduleDailyReminder(
          stateRef.current.reminderHour,
          stateRef.current.reminderMinute ?? 0
        );
        persist((prev) => ({ ...prev, notificationsEnabled: ok }));
        return ok;
      }
      await cancelDailyReminder();
      persist((prev) => ({ ...prev, notificationsEnabled: false }));
      return true;
    },
    [persist]
  );

  const setWeightUnit = useCallback(
    (unit: WeightUnit) => {
      persist((prev) => ({ ...prev, weightUnit: unit }));
    },
    [persist]
  );

  const setGoal = useCallback(
    (goal: Goal) => {
      persist((prev) => ({ ...prev, goal }));
    },
    [persist]
  );

  const setLevel = useCallback(
    (level: FitnessLevel) => {
      persist((prev) => ({ ...prev, level }));
    },
    [persist]
  );

  const setUserName = useCallback(
    (name: string) => {
      persist((prev) => ({ ...prev, userName: name }));
    },
    [persist]
  );

  const resetAll = useCallback(() => {
    persist(() => ({ ...DEFAULT_STATE, userId: uid() }));
  }, [persist]);

  const deleteAccount = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const safe = async <T,>(label: string, fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`[AppProvider] ${label} threw`, msg);
        return null;
      }
    };

    if (isSupabaseConfigured) {
      const userRes = await safe("getUser", () => supabase.auth.getUser());
      const authUid = userRes?.data.user?.id ?? null;
      if (authUid) {
        console.log("[AppProvider] deleting user data for", authUid);
        await safe("delete rows", async () => {
          await Promise.allSettled([
            supabase.from(WEIGHT_LOGS_TABLE).delete().eq("user_id", authUid),
            supabase.from(PROGRESS_PHOTOS_TABLE).delete().eq("user_id", authUid),
            supabase.from(PROFILES_TABLE).delete().eq("user_id", authUid),
          ]);
        });
        await safe("storage cleanup", async () => {
          const { data: list } = await supabase.storage
            .from("progress-photos")
            .list(authUid);
          if (list && list.length > 0) {
            const paths = list.map((f) => `${authUid}/${f.name}`);
            await supabase.storage.from("progress-photos").remove(paths);
          }
        });
        const rpcRes = await safe("rpc delete_current_user", () =>
          supabase.rpc("delete_current_user")
        );
        if (!rpcRes || rpcRes.error) {
          if (rpcRes?.error) console.log("[AppProvider] rpc error", rpcRes.error.message);
          const fnRes = await safe("edge delete-user", () =>
            supabase.functions.invoke("delete-user")
          );
          if (fnRes?.error) console.log("[AppProvider] edge fn error", fnRes.error.message);
        }
        await safe("signOut", () => supabase.auth.signOut());
      }
    }

    await safe("clear storage", () => AsyncStorage.removeItem(STORAGE_KEY));
    await safe("cancel reminders", async () => {
      await cancelDailyReminder();
      await cancelWeeklyWeightReminder();
    });

    try {
      const fresh: AppState = { ...DEFAULT_STATE, userId: uid() };
      stateRef.current = fresh;
      setState(fresh);
      setSupabaseUserId(null);
    } catch (e) {
      console.log("[AppProvider] reset state error", e);
    }

    return { ok: true };
  }, []);

  const setPremium = useCallback(
    (value: boolean) => {
      persist((prev) => ({ ...prev, isPremium: value }));
    },
    [persist]
  );

  const useSkipToken = useCallback(async (): Promise<void> => {
    const prev = stateRef.current;
    if (!prev.isPremium) {
      console.log("[skip] blocked: not premium");
      return;
    }
    if (prev.skipUsedThisWeek) {
      console.log("[skip] blocked: already used this week");
      return;
    }
    const today = toDateKey(new Date());
    if (prev.completedDates.includes(today)) {
      console.log("[skip] blocked: already completed today");
      return;
    }

    let userId = prev.userId;
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.auth.getUser();
        const authed = data?.user?.id;
        if (authed) userId = authed;
      } catch (e) {
        console.log("[skip] auth.getUser error", e);
      }
    }

    const groupsSnapshot = prev.groups;
    const groupIds = groupsSnapshot.map((g) => g.id);
    const successGroups: string[] = [];
    const failedGroups: string[] = [];

    if (isSupabaseConfigured && groupsSnapshot.length > 0) {
      for (const g of groupsSnapshot) {
        try {
          const selfMember = g.members.find((m) => m.isSelf);
          const nextTotal =
            (selfMember?.totalCompletions ?? 0) +
            (selfMember?.completedToday ? 0 : 1);
          const memberRes = await updateMemberCompletionRemote({
            groupId: g.id,
            userId,
            completedToday: true,
            streak: selfMember?.streak ?? 0,
            totalCompletions: nextTotal,
          });
          if (!memberRes.ok) {
            failedGroups.push(g.id);
            continue;
          }
          const streakResult = await computeAndUpdateGroupStreakRemote(g.id);
          if (!streakResult?.ok) {
            failedGroups.push(g.id);
            continue;
          }
          successGroups.push(g.id);
        } catch (e) {
          console.log("[skip] group sync error", g.id, e);
          failedGroups.push(g.id);
        }
      }
    }

    const hasGroups = groupsSnapshot.length > 0;
    const anyFailed = failedGroups.length > 0;
    const allFailed = hasGroups && successGroups.length === 0;
    const shouldConsumeToken = !hasGroups || successGroups.length > 0;

    console.log("Skip token result", {
      userId,
      successGroups,
      failedGroups,
      tokenConsumed: shouldConsumeToken,
    });

    if (allFailed) {
      Alert.alert(
        "Failed to apply skip token",
        "Could not sync with your group(s). Your skip token was not used."
      );
      return;
    }

    const successSet = new Set(successGroups);

    persist((p) => {
      if (p.completedDates.includes(today)) {
        return {
          ...p,
          skipUsedThisWeek: shouldConsumeToken ? true : p.skipUsedThisWeek,
          lastSkipUsedAt: shouldConsumeToken ? today : p.lastSkipUsedAt,
        };
      }
      let nextStreak = 1;
      if (p.lastCompletedDate) {
        const diff = daysBetween(p.lastCompletedDate, today);
        if (diff === 0) nextStreak = p.streak;
        else if (diff === 1) nextStreak = p.streak + 1;
        else nextStreak = p.streak + 1;
      }
      const nextGroups = p.groups.map((g) => {
        if (!successSet.has(g.id)) return g;
        const members = g.members.map((m) => {
          if (!m.isSelf) return m;
          if (m.completedToday) return m;
          return {
            ...m,
            completedToday: true,
            totalCompletions: (m.totalCompletions ?? 0) + 1,
          };
        });
        return { ...g, members };
      });
      let out: AppState = {
        ...p,
        streak: nextStreak,
        longestStreak: Math.max(p.longestStreak, nextStreak),
        lastCompletedDate: today,
        completedDates: [...p.completedDates, today],
        skipUsedThisWeek: shouldConsumeToken ? true : p.skipUsedThisWeek,
        lastSkipUsedAt: shouldConsumeToken ? today : p.lastSkipUsedAt,
        groups: nextGroups,
      };
      out = checkStreakMedals(out, nextStreak);
      return out;
    });

    if (isSupabaseConfigured && successGroups.length > 0) {
      void fetchUserGroups(userId)
        .then((freshGroups) => {
          if (!freshGroups) return;
          persist((p) => {
            const freshById = new Map(freshGroups.map((g) => [g.id, g]));
            const nextGroups = p.groups.map((g) =>
              successSet.has(g.id) && freshById.has(g.id)
                ? (freshById.get(g.id) as Group)
                : g
            );
            return { ...p, groups: nextGroups };
          });
        })
        .catch((e) => {
          console.log("[skip] background refresh groups error", e);
        });
    }

    if (hasGroups && anyFailed && successGroups.length > 0) {
      Alert.alert(
        "Skip token partially applied",
        `Applied to ${successGroups.length} group(s), failed on ${failedGroups.length} group(s).`
      );
    }
  }, [persist, checkStreakMedals]);

  const completeProgramDay = useCallback(
    (
      programId: string,
      day: number,
      stats?: { reps: number; minutes: number }
    ) => {
      persist((prev) => {
        const today = toDateKey(new Date());
        if (prev.completedDates.includes(today)) return prev;
        const current = prev.programs[programId] ?? {
          currentDay: 1,
          completedDays: [],
          lastCompletedDate: null,
          streak: 0,
        };
        if (current.completedDays.includes(day)) return prev;
        if (current.lastCompletedDate === today) return prev;
        let nextStreak = 1;
        if (current.lastCompletedDate) {
          const diff = daysBetween(current.lastCompletedDate, today);
          if (diff === 1) nextStreak = current.streak + 1;
          else if (diff === 0) nextStreak = current.streak;
        }
        const newCompleted = [...current.completedDays, day].sort(
          (a, b) => a - b
        );
        const nextCurrent = Math.max(current.currentDay, day + 1);
        const nextProgress: ProgramProgress = {
          currentDay: nextCurrent,
          completedDays: newCompleted,
          lastCompletedDate: today,
          streak: nextStreak,
        };
        const globalCompleted = prev.completedDates.includes(today)
          ? prev.completedDates
          : [...prev.completedDates, today];
        let globalStreak = prev.streak;
        let globalLast = prev.lastCompletedDate;
        if (!prev.completedDates.includes(today)) {
          if (prev.lastCompletedDate) {
            const diff = daysBetween(prev.lastCompletedDate, today);
            if (diff === 1) globalStreak = prev.streak + 1;
            else if (diff !== 0) globalStreak = 1;
          } else {
            globalStreak = 1;
          }
          globalLast = today;
        }
        let out: AppState = {
          ...prev,
          programs: { ...prev.programs, [programId]: nextProgress },
          completedDates: globalCompleted,
          streak: globalStreak,
          lastCompletedDate: globalLast,
          totalReps: prev.totalReps + (stats?.reps ?? 0),
          totalMinutes: prev.totalMinutes + (stats?.minutes ?? 0),
        };
        out = {
          ...out,
          longestStreak: Math.max(out.longestStreak, globalStreak),
        };
        out = checkStreakMedals(out, globalStreak);

        const program = getProgram(programId);
        if (program && newCompleted.length >= program.durationDays) {
          const medalId: MedalId = programMedalId(programId);
          out = awardMedalIfNew(out, medalId, { programId });
        }
        return out;
      });
    },
    [persist, checkStreakMedals, awardMedalIfNew]
  );

  const canCreateGroup = useCallback((): boolean => {
    return stateRef.current.isPremium;
  }, []);

  const canJoinGroup = useCallback((): boolean => {
    if (stateRef.current.isPremium) return true;
    return stateRef.current.groups.length < 1;
  }, []);

  const createGroup = useCallback(
    async (name: string): Promise<Group | null> => {
      const userName = stateRef.current.userName || "Athlete";
      const localCode = code();
      console.log("[AppProvider] createGroup: verifying auth before insert");
      let authedUserId: string | null = null;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) {
            console.log("[AppProvider] createGroup auth.getUser error", error.message);
          }
          authedUserId = data?.user?.id ?? null;
        } catch (e) {
          console.log("[AppProvider] createGroup auth.getUser exception", e);
        }
      } else {
        authedUserId = stateRef.current.userId || null;
      }
      if (!authedUserId) {
        console.log("[AppProvider] createGroup aborted: auth not ready");
        throw new Error("AUTH_NOT_READY");
      }
      const userId = authedUserId;
      console.log("[AppProvider] Creating group now", {
        userId,
        name,
        code: localCode,
      });
      if (isSupabaseConfigured) {
        const remote = await createGroupRemote({
          userId,
          userName,
          name,
          code: localCode,
        });
        if (!remote) {
          console.error("[AppProvider] createGroup: remote insert failed");
          throw new Error("INSERT_FAILED");
        }
        persist((prev) => ({ ...prev, groups: [...prev.groups, remote] }));
        return remote;
      }
      const g: Group = {
        id: uid(),
        name,
        code: localCode,
        createdAt: Date.now(),
        icon: "🔥",
        ownerId: userId,
        joinedAt: toDateKey(new Date()),
        streak: 0,
        lastSuccessDate: null,
        lastResetDate: toDateKey(new Date()),
        members: [
          {
            id: userId,
            name: userName,
            streak: 0,
            completedToday: false,
            totalCompletions: 0,
            isSelf: true,
          },
        ],
      };
      persist((prev) => ({ ...prev, groups: [...prev.groups, g] }));
      return g;
    },
    [persist]
  );

  const refreshGroups = useCallback(async (): Promise<{
    groups: Group[];
    removedGroups: Group[];
  }> => {
    const userId = stateRef.current.userId;
    if (!userId) return { groups: stateRef.current.groups, removedGroups: [] };
    try {
      const remoteGroups = await fetchUserGroups(userId);
      if (remoteGroups === null) {
        console.log("[AppProvider] refreshGroups fetch failed, keeping local state");
        return { groups: stateRef.current.groups, removedGroups: [] };
      }
      console.log("[AppProvider] refreshGroups fetched", remoteGroups.length);
      const remoteIds = new Set(remoteGroups.map((g) => g.id));
      const removedGroups = stateRef.current.groups.filter((g) => !remoteIds.has(g.id));
      if (removedGroups.length > 0) {
        console.log(
          "[AppProvider] refreshGroups pruning removed groups",
          removedGroups.map((g) => ({ id: g.id, name: g.name }))
        );
      }
      persist((prev) => {
        const byId = new Map<string, Group>();
        for (const g of prev.groups) {
          if (remoteIds.has(g.id)) byId.set(g.id, g);
        }
        for (const g of remoteGroups) byId.set(g.id, g);
        const removedIds = new Set(removedGroups.map((g) => g.id));
        return {
          ...prev,
          groups: Array.from(byId.values()),
          messages: prev.messages.filter((m) => !removedIds.has(m.groupId)),
          workoutPhotos: prev.workoutPhotos.filter((p) => !removedIds.has(p.groupId)),
          nudges: prev.nudges.filter((n) => !removedIds.has(n.groupId)),
        };
      });
      return { groups: stateRef.current.groups, removedGroups };
    } catch (e) {
      console.log("[AppProvider] refreshGroups error", e);
      return { groups: stateRef.current.groups, removedGroups: [] };
    }
  }, [persist]);

  const joinGroup = useCallback(
    async (inviteCode: string): Promise<
      | { ok: true; group: Group }
      | { ok: false; reason: "empty" | "not_found" | "full" | "error"; message?: string }
    > => {
      const code = inviteCode.trim().toUpperCase();
      console.log("[AppProvider] joinGroup invoked", { code });
      if (!code) return { ok: false, reason: "empty" };
      const existingLocal = stateRef.current.groups.find(
        (g) => g.code === code && g.members.some((m) => m.isSelf)
      );
      if (existingLocal) {
        console.log("[AppProvider] already a member locally", existingLocal.id);
        return { ok: true, group: existingLocal };
      }
      const userId = stateRef.current.userId;
      const userName = stateRef.current.userName || "Athlete";
      const remote = await joinGroupRemote({
        userId,
        userName,
        code,
        maxMembers: MAX_GROUP_MEMBERS,
      });
      console.log("[AppProvider] joinGroupRemote returned", remote.ok ? "ok" : remote.reason);
      if (remote.ok) {
        persist((prev) => {
          const existingIdx = prev.groups.findIndex((g) => g.id === remote.group.id);
          if (existingIdx >= 0) {
            const next = [...prev.groups];
            next[existingIdx] = remote.group;
            return { ...prev, groups: next };
          }
          return { ...prev, groups: [...prev.groups, remote.group] };
        });
        refreshGroups().catch((e) => console.log("[AppProvider] post-join refresh error", e));
        console.log("[AppProvider] joinGroup success, groups now", stateRef.current.groups.length);
        return { ok: true, group: remote.group };
      }
      if (remote.reason === "error") {
        const existing = stateRef.current.groups.find((g) => g.code === code);
        if (existing) {
          if (existing.members.some((m) => m.isSelf)) {
            return { ok: true, group: existing };
          }
          if (existing.members.length >= MAX_GROUP_MEMBERS) {
            return { ok: false, reason: "full" };
          }
          const updated: Group = {
            ...existing,
            members: [
              ...existing.members,
              {
                id: userId,
                name: userName,
                streak: 0,
                completedToday: false,
                totalCompletions: 0,
                isSelf: true,
              },
            ],
          };
          persist((prev) => ({
            ...prev,
            groups: prev.groups.map((g) => (g.id === existing.id ? updated : g)),
          }));
          return { ok: true, group: updated };
        }
      }
      return { ok: false, reason: remote.reason, message: remote.message };
    },
    [persist, refreshGroups]
  );

  const setGroupIcon = useCallback(
    (groupId: string, icon: string) => {
      persist((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g.id === groupId ? { ...g, icon } : g
        ),
      }));
      updateGroupIconRemote(groupId, icon).catch((e) =>
        console.log("[AppProvider] setGroupIcon remote error", e)
      );
    },
    [persist]
  );

  const leaveGroup = useCallback(
    (groupId: string) => {
      const userId = stateRef.current.userId;
      persist((prev) => ({
        ...prev,
        groups: prev.groups.filter((g) => g.id !== groupId),
        messages: prev.messages.filter((m) => m.groupId !== groupId),
        workoutPhotos: prev.workoutPhotos.filter((p) => p.groupId !== groupId),
      }));
      leaveGroupRemote(userId, groupId).catch((e) =>
        console.log("[AppProvider] leaveGroupRemote error", e)
      );
    },
    [persist]
  );

  const deleteGroup = useCallback(
    async (groupId: string): Promise<boolean> => {
      console.log("[AppProvider] deleteGroup start", { groupId });
      const res = await deleteGroupRemote(groupId);
      if (!res.ok) {
        console.log("[AppProvider] deleteGroup failed", res.message);
        return false;
      }
      persist((prev) => ({
        ...prev,
        groups: prev.groups.filter((g) => g.id !== groupId),
        messages: prev.messages.filter((m) => m.groupId !== groupId),
        workoutPhotos: prev.workoutPhotos.filter((p) => p.groupId !== groupId),
        nudges: prev.nudges.filter((n) => n.groupId !== groupId),
      }));
      return true;
    },
    [persist]
  );

  const sendMessage = useCallback(
    (groupId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      persist((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: uid(),
            groupId,
            authorId: prev.userId,
            authorName: prev.userName,
            text: trimmed,
            createdAt: Date.now(),
          },
        ],
      }));
    },
    [persist]
  );

  const sendNudge = useCallback(
    (groupId: string, toId: string) => {
      const today = toDateKey(new Date());
      const senderName = stateRef.current.userName || "A teammate";
      persist((prev) => ({
        ...prev,
        nudges: [
          ...prev.nudges,
          { fromId: prev.userId, toId, groupId, at: Date.now(), date: today },
        ],
      }));
      (async () => {
        try {
          console.log("[nudge] sending push to", toId, "from", senderName);
          const token = await fetchUserPushToken(toId);
          if (!token) {
            console.log("[nudge] no push token for user", toId);
            return;
          }
          const ok = await sendExpoPushNotification({
            to: token,
            title: "Reminder from your team",
            body: `${senderName} is reminding you to complete today's workout. Don\u2019t mess up the streak!`,
            data: { type: "nudge", groupId, fromId: stateRef.current.userId },
          });
          if (!ok) console.log("[nudge] push send failed");
        } catch (e) {
          console.log("[nudge] push exception", e);
        }
      })();
    },
    [persist]
  );

  const addWorkoutPhoto = useCallback(
    (uri: string) => {
      const today = toDateKey(new Date());
      const groupsSnapshot = stateRef.current.groups;
      const selfId = stateRef.current.userId;
      const selfName = stateRef.current.userName || "Athlete";

      persist((prev) => {
        if (prev.groups.length === 0) return prev;
        const newPhotos: WorkoutPhoto[] = prev.groups.map((g) => ({
          id: uid(),
          userId: prev.userId,
          userName: prev.userName || "Athlete",
          groupId: g.id,
          date: today,
          uri,
          createdAt: Date.now(),
        }));
        const filtered = prev.workoutPhotos.filter(
          (p) => !(p.userId === prev.userId && p.date === today)
        );
        const updatedGroups = prev.groups.map((g) => {
          const members = g.members.map((m) =>
            m.isSelf
              ? {
                  ...m,
                  completedToday: true,
                  totalCompletions: m.totalCompletions + (m.completedToday ? 0 : 1),
                }
              : m
          );
          const allDone = members.length >= 2 && members.every((m) => m.completedToday);
          let streak = g.streak;
          let lastSuccessDate = g.lastSuccessDate;
          if (allDone && g.lastSuccessDate !== today) {
            if (g.lastSuccessDate) {
              const gap = daysBetween(g.lastSuccessDate, today);
              streak = gap === 1 ? g.streak + 1 : 1;
            } else {
              streak = 1;
            }
            lastSuccessDate = today;
          }
          return { ...g, members, streak, lastSuccessDate };
        });
        return {
          ...prev,
          workoutPhotos: [...filtered, ...newPhotos],
          groups: updatedGroups,
        };
      });

      (async () => {
        if (!isSupabaseConfigured) return;
        for (const g of groupsSnapshot) {
          try {
            const selfMember = g.members.find((m) => m.isSelf);
            const totalCompletions = (selfMember?.totalCompletions ?? 0) + (selfMember?.completedToday ? 0 : 1);
            const insertResult = await insertGroupPhotoRemote({
              groupId: g.id,
              userId: selfId,
              userName: selfName,
              localUri: uri,
            });
            if (!insertResult.ok) {
              const code = (insertResult as { code?: string }).code;
              const details = (insertResult as { details?: string }).details;
              console.error(
                "[AppProvider] group photo insert failed",
                JSON.stringify({
                  groupId: g.id,
                  reason: insertResult.reason,
                  message: insertResult.message,
                  code,
                  details,
                })
              );
              Alert.alert(
                "Photo upload failed",
                JSON.stringify({
                  message: insertResult.message ?? "Unknown error",
                  code,
                  details,
                })
              );
              continue;
            }
            await updateMemberCompletionRemote({
              groupId: g.id,
              userId: selfId,
              completedToday: true,
              streak: selfMember?.streak ?? 0,
              totalCompletions,
            });
            const nextGroup = stateRef.current.groups.find((gg) => gg.id === g.id);
            if (nextGroup) {
              await updateGroupStreakRemote({
                groupId: g.id,
                streak: nextGroup.streak,
                lastSuccessDate: nextGroup.lastSuccessDate,
                lastResetDate: nextGroup.lastResetDate,
              });
            }
          } catch (e) {
            console.log("[AppProvider] group photo sync error", e);
          }
        }
      })();
    },
    [persist]
  );

  const refreshGroupPhotos = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const today = toDateKey(new Date());
    const groupIds = stateRef.current.groups.map((g) => g.id);
    if (groupIds.length === 0) return;
    try {
      const remotePhotos = await fetchGroupPhotosRemote(groupIds);
      if (remotePhotos.length === 0) return;
      const selfId = stateRef.current.userId;
      persist((prev) => {
        const mergedMap = new Map<string, WorkoutPhoto>();
        for (const p of prev.workoutPhotos) {
          mergedMap.set(`${p.groupId}:${p.userId}:${p.date}`, p);
        }
        for (const r of remotePhotos) {
          mergedMap.set(`${r.groupId}:${r.userId}:${r.date}`, {
            id: r.id,
            userId: r.userId,
            userName: r.userName,
            groupId: r.groupId,
            date: r.date,
            uri: r.uri,
            createdAt: r.createdAt,
          });
        }
        const photoUserIdsByGroup = new Map<string, Set<string>>();
        for (const p of mergedMap.values()) {
          if (p.date !== today) continue;
          const set = photoUserIdsByGroup.get(p.groupId) ?? new Set<string>();
          set.add(p.userId);
          photoUserIdsByGroup.set(p.groupId, set);
        }
        const updatedGroups = prev.groups.map((g) => {
          const completedUserIds = photoUserIdsByGroup.get(g.id) ?? new Set<string>();
          const members = g.members.map((m) => {
            const didToday = m.isSelf
              ? m.completedToday || completedUserIds.has(selfId)
              : completedUserIds.has(m.id);
            return { ...m, completedToday: didToday };
          });
          return { ...g, members };
        });
        return {
          ...prev,
          workoutPhotos: Array.from(mergedMap.values()),
          groups: updatedGroups,
        };
      });
    } catch (e) {
      console.log("[AppProvider] refreshGroupPhotos error", e);
    }
  }, [persist]);

  const isInAnyGroup = useCallback((): boolean => {
    return stateRef.current.groups.length > 0;
  }, []);

  const canSendNudge = useCallback(
    (groupId: string, toId: string): boolean => {
      const s = stateRef.current;
      const today = toDateKey(new Date());
      if (!s.completedDates.includes(today)) return false;
      const already = s.nudges.some(
        (n) =>
          n.fromId === s.userId &&
          n.toId === toId &&
          n.groupId === groupId &&
          n.date === today
      );
      return !already;
    },
    []
  );

  const dismissMedal = useCallback(() => {
    setPendingMedal(null);
  }, []);

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const completedToday = useMemo(
    () => state.completedDates.includes(todayKey),
    [state.completedDates, todayKey]
  );

  const todayWorkout = useMemo(() => {
    const level = state.level ?? "beginner";
    return getTodayWorkout(level, dayOfYear(new Date()));
  }, [state.level]);

  const skipAvailable = useMemo(
    () => state.isPremium && !state.skipUsedThisWeek,
    [state.isPremium, state.skipUsedThisWeek]
  );

  const personalizedPlanDays = useMemo<PlanDay[]>(() => {
    if (!state.personalizedPlan) return [];
    return buildPersonalizedPlan(state.personalizedPlan.focusAreas);
  }, [state.personalizedPlan]);

  const personalizedPlanName = useMemo<string | null>(() => {
    if (!state.personalizedPlan) return null;
    return planName(state.personalizedPlan.focusAreas);
  }, [state.personalizedPlan]);

  const startPersonalizedPlan = useCallback(
    (focusAreas: FocusArea[]) => {
      persist((prev) => ({
        ...prev,
        personalizedPlan: {
          focusAreas,
          startedAt: toDateKey(new Date()),
          currentDay: 1,
          completedDays: [],
          lastCompletedDate: null,
        },
        activeEnrollment: { kind: "plan" },
      }));
    },
    [persist]
  );

  const enrollInProgram = useCallback(
    (programId: string) => {
      persist((prev) => ({
        ...prev,
        activeEnrollment: { kind: "program", programId },
      }));
    },
    [persist]
  );

  const pauseEnrollment = useCallback(() => {
    persist((prev) => ({ ...prev, activeEnrollment: null }));
  }, [persist]);

  const markCreateGroupInfoSeen = useCallback(() => {
    persist((prev) => (prev.hasSeenCreateGroupInfo ? prev : { ...prev, hasSeenCreateGroupInfo: true }));
  }, [persist]);

  const resumePlanEnrollment = useCallback(() => {
    persist((prev) => {
      if (!prev.personalizedPlan) return prev;
      return { ...prev, activeEnrollment: { kind: "plan" } };
    });
  }, [persist]);

  const exitPersonalizedPlan = useCallback(() => {
    persist((prev) => ({ ...prev, personalizedPlan: null }));
  }, [persist]);

  const restartPersonalizedPlan = useCallback(() => {
    persist((prev) => {
      if (!prev.personalizedPlan) return prev;
      return {
        ...prev,
        personalizedPlan: {
          ...prev.personalizedPlan,
          startedAt: toDateKey(new Date()),
          currentDay: 1,
          completedDays: [],
          lastCompletedDate: null,
        },
      };
    });
  }, [persist]);

  const completePersonalizedPlanDay = useCallback(
    (day: number, stats?: { reps: number; minutes: number }) => {
      persist((prev) => {
        if (!prev.personalizedPlan) return prev;
        const today = toDateKey(new Date());
        if (prev.completedDates.includes(today)) return prev;
        const pp = prev.personalizedPlan;
        if (pp.completedDays.includes(day)) return prev;
        if (pp.lastCompletedDate === today) return prev;
        const newCompleted = [...pp.completedDays, day].sort((a, b) => a - b);
        const nextCurrent = Math.min(
          Math.max(pp.currentDay, day + 1),
          PLAN_DURATION_DAYS
        );
        const globalCompleted = prev.completedDates.includes(today)
          ? prev.completedDates
          : [...prev.completedDates, today];
        let globalStreak = prev.streak;
        let globalLast = prev.lastCompletedDate;
        if (!prev.completedDates.includes(today)) {
          if (prev.lastCompletedDate) {
            const diff = daysBetween(prev.lastCompletedDate, today);
            if (diff === 1) globalStreak = prev.streak + 1;
            else if (diff !== 0) globalStreak = 1;
          } else {
            globalStreak = 1;
          }
          globalLast = today;
        }
        let out: AppState = {
          ...prev,
          personalizedPlan: {
            ...pp,
            currentDay: nextCurrent,
            completedDays: newCompleted,
            lastCompletedDate: today,
          },
          completedDates: globalCompleted,
          streak: globalStreak,
          lastCompletedDate: globalLast,
          totalReps: prev.totalReps + (stats?.reps ?? 0),
          totalMinutes: prev.totalMinutes + (stats?.minutes ?? 0),
          longestStreak: Math.max(prev.longestStreak, globalStreak),
        };
        out = checkStreakMedals(out, globalStreak);
        if (newCompleted.length >= PLAN_DURATION_DAYS) {
          out = awardMedalIfNew(out, PERSONAL_PLAN_MEDAL_ID);
        }
        return out;
      });
    },
    [persist, checkStreakMedals, awardMedalIfNew]
  );

  return useMemo(
    () => ({
      state,
      hydrated,
      todayKey,
      completedToday,
      todayWorkout,
      pendingMedal,
      dismissMedal,
      skipAvailable,
      personalizedPlanDays,
      personalizedPlanName,
      startPersonalizedPlan,
      exitPersonalizedPlan,
      restartPersonalizedPlan,
      completePersonalizedPlanDay,
      enrollInProgram,
      pauseEnrollment,
      resumePlanEnrollment,
      markCreateGroupInfoSeen,
      completeOnboarding,
      saveOnboardingAnswers,
      completeTodaysWorkout,
      useSkipToken,
      logWeight,
      setPhoto,
      deletePhoto,
      setReminderHour,
      setReminderTime,
      setNotificationsEnabled,
      setWeightUnit,
      setGoal,
      setLevel,
      setUserName,
      resetAll,
      deleteAccount,
      setPremium,
      completeProgramDay,
      createGroup,
      joinGroup,
      refreshGroups,
      leaveGroup,
      deleteGroup,
      setGroupIcon,
      sendMessage,
      sendNudge,
      canCreateGroup,
      canJoinGroup,
      addWorkoutPhoto,
      refreshGroupPhotos,
      isInAnyGroup,
      canSendNudge,
      isAuthReady: Boolean(supabaseUserId),
    }),
    [
      state,
      hydrated,
      todayKey,
      completedToday,
      todayWorkout,
      pendingMedal,
      dismissMedal,
      skipAvailable,
      personalizedPlanDays,
      personalizedPlanName,
      startPersonalizedPlan,
      exitPersonalizedPlan,
      restartPersonalizedPlan,
      completePersonalizedPlanDay,
      enrollInProgram,
      pauseEnrollment,
      resumePlanEnrollment,
      markCreateGroupInfoSeen,
      completeOnboarding,
      saveOnboardingAnswers,
      completeTodaysWorkout,
      useSkipToken,
      logWeight,
      setPhoto,
      deletePhoto,
      setReminderHour,
      setReminderTime,
      setNotificationsEnabled,
      setWeightUnit,
      setGoal,
      setLevel,
      setUserName,
      resetAll,
      deleteAccount,
      setPremium,
      completeProgramDay,
      createGroup,
      joinGroup,
      refreshGroups,
      leaveGroup,
      deleteGroup,
      setGroupIcon,
      sendMessage,
      sendNudge,
      canCreateGroup,
      canJoinGroup,
      addWorkoutPhoto,
      refreshGroupPhotos,
      isInAnyGroup,
      canSendNudge,
      supabaseUserId,
    ]
  );
});

export function estimateWorkoutReps(
  exercises: { name: string; reps: string }[]
): number {
  return exercises.reduce((sum, e) => sum + parseReps(e.reps), 0);
}
