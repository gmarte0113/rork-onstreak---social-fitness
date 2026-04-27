import { Platform } from "react-native";
import { supabase, isSupabaseConfigured, PROFILES_TABLE } from "@/lib/supabase";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const Notifications = await import("expo-notifications");
    const granted = await ensureNotificationsPermission();
    if (!granted) {
      console.log("[push] permission not granted");
      return null;
    }
    if (Platform.OS === "android") {
      try {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      } catch (e) {
        console.log("[push] channel error", e);
      }
    }
    const projectId =
      process.env.EXPO_PUBLIC_PROJECT_ID ||
      process.env.EXPO_PUBLIC_RORK_APP_KEY ||
      undefined;
    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenRes.data ?? null;
    console.log("[push] expo push token:", token);
    return token;
  } catch (e) {
    console.log("[push] register error", e);
    return null;
  }
}

export async function savePushTokenToProfile(
  userId: string,
  token: string
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase
      .from(PROFILES_TABLE)
      .upsert(
        { user_id: userId, expo_push_token: token, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) {
      console.log("[push] save token error", error.message);
    } else {
      console.log("[push] token saved for user", userId);
    }
  } catch (e) {
    console.log("[push] save token exception", e);
  }
}

export async function fetchUserPushToken(
  targetUserId: string
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.rpc("get_user_push_token", {
      target_user_id: targetUserId,
    });
    if (error) {
      console.log("[push] fetch token rpc error", error.message);
      return null;
    }
    return (data as string | null) ?? null;
  } catch (e) {
    console.log("[push] fetch token exception", e);
    return null;
  }
}

export async function sendExpoPushNotification(params: {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<boolean> {
  if (Platform.OS === "web") {
    console.log("[push] skipping send on web (CORS blocks exp.host)");
    return false;
  }
  try {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: params.to,
        sound: "default",
        title: params.title,
        body: params.body,
        data: params.data ?? {},
      }),
    });
    const json = (await res.json().catch(() => null)) as
      | { data?: { status?: string; message?: string }; errors?: unknown }
      | null;
    if (!res.ok) {
      console.log("[push] send http error", res.status, json);
      return false;
    }
    const status = json?.data?.status;
    if (status && status !== "ok") {
      console.log("[push] send non-ok status", json);
      return false;
    }
    console.log("[push] send ok", json?.data);
    return true;
  } catch (e) {
    console.log("[push] send exception", e);
    return false;
  }
}

const NUDGE_MESSAGES: { title: string; body: string }[] = [
  {
    title: "Time to move",
    body: "Your 3-minute workout is waiting. Keep the streak alive.",
  },
  {
    title: "Don't break the chain",
    body: "A quick session now keeps your streak climbing.",
  },
  {
    title: "Consistency > intensity",
    body: "Just a few minutes today. You've got this.",
  },
  {
    title: "Your daily nudge",
    body: "Open OnStreak and log today's workout.",
  },
];

function pickMessage(): { title: string; body: string } {
  return NUDGE_MESSAGES[Math.floor(Math.random() * NUDGE_MESSAGES.length)];
}

export async function ensureNotificationsPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const Notifications = await import("expo-notifications");
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === "granted") return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === "granted";
  } catch (e) {
    console.log("[notifications] permission error", e);
    return false;
  }
}

export async function configureNotificationHandler(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.log("[notifications] handler error", e);
  }
}

const DAILY_IDENTIFIER = "onstreak-daily-reminder";
const WEEKLY_WEIGHT_IDENTIFIER = "onstreak-weekly-weight";

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("[notifications] cancelled all scheduled");
  } catch (e) {
    console.log("[notifications] cancel error", e);
  }
}

export async function cancelWeeklyWeightReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Notifications = await import("expo-notifications");
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier === WEEKLY_WEIGHT_IDENTIFIER) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (e) {
    console.log("[notifications] cancel weekly error", e);
  }
}

export async function scheduleWeeklyWeightReminder(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const Notifications = await import("expo-notifications");
    const granted = await ensureNotificationsPermission();
    if (!granted) return false;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const already = scheduled.find((n) => n.identifier === WEEKLY_WEIGHT_IDENTIFIER);
    if (already) return true;
    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_WEIGHT_IDENTIFIER,
      content: {
        title: "Weekly weigh-in",
        body: "Log your current weight to track long-term progress.",
        sound: "default",
        data: { route: "/log-weight" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1,
        hour: 9,
        minute: 0,
      },
    });
    console.log("[notifications] scheduled weekly weight reminder");
    return true;
  } catch (e) {
    console.log("[notifications] weekly schedule error", e);
    return false;
  }
}

export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const Notifications = await import("expo-notifications");
    const granted = await ensureNotificationsPermission();
    if (!granted) {
      console.log("[notifications] permission not granted");
      return false;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    const msg = pickMessage();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    console.log(
      `[notifications] scheduled daily at ${hour}:${String(minute).padStart(2, "0")}`
    );
    return true;
  } catch (e) {
    console.log("[notifications] schedule error", e);
    return false;
  }
}
