import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const FALLBACK_SUPABASE_URL = "https://cmonahcmbxrheubfnkaf.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtb25haGNtYnhyaGV1YmZua2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODczOTMsImV4cCI6MjA5MTk2MzM5M30.2hCwm9S9Joaf8qjycbeNkDkm4dn6DVlJGsoPE7uKfzE";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_V2 || FALLBACK_SUPABASE_ANON_KEY;

export const isSupabaseConfigured: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabaseKeySource: "env" | "fallback" =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY_V2 && process.env.EXPO_PUBLIC_SUPABASE_URL ? "env" : "fallback";

console.log("[supabase] init", { source: supabaseKeySource, urlPresent: Boolean(SUPABASE_URL), keyLen: SUPABASE_ANON_KEY.length });

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: Platform.OS === "web" ? undefined : (AsyncStorage as unknown as never),
      autoRefreshToken: isSupabaseConfigured,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export const PROFILES_TABLE = "profiles";
export const WEIGHT_LOGS_TABLE = "weight_entries";
export const PROGRESS_PHOTOS_TABLE = "progress_photos";
export const PHOTOS_BUCKET = "progress-photos";

export type ProfileRow = {
  user_id: string;
  name: string | null;
  goal: string | null;
  level: string | null;
  weight_unit: string | null;
  streak: number;
  longest_streak: number;
  completed_dates: string[];
  total_reps: number;
  total_minutes: number;
  updated_at?: string;
};

export type WeightLogRow = {
  id?: string;
  user_id: string;
  date: string;
  weight_kg: number;
  created_at?: string;
};

export type ProgressPhotoRow = {
  id?: string;
  user_id: string;
  kind: "before" | "after";
  date: string;
  path: string;
  url: string;
  created_at?: string;
};

let lastAuthError: string | null = null;
export function getLastAuthError(): string | null {
  return lastAuthError;
}

function isInvalidRefreshTokenError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("refresh token not found") ||
    m.includes("invalid refresh token") ||
    m.includes("refresh_token_not_found")
  );
}

export async function clearStaleSession(reason: string): Promise<void> {
  try {
    console.log("[supabase] clearing stale session:", reason);
    await supabase.auth.signOut({ scope: "local" });
  } catch (e) {
    console.log("[supabase] clearStaleSession signOut error", e);
  }
  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(
      (k) => k.startsWith("sb-") || k.includes("supabase.auth") || k.includes("-auth-token")
    );
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
      console.log("[supabase] removed auth keys", authKeys.length);
    }
  } catch (e) {
    console.log("[supabase] clearStaleSession storage error", e);
  }
}

export async function safeGetSession(): Promise<{ userId: string | null }> {
  if (!isSupabaseConfigured) return { userId: null };
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      if (isInvalidRefreshTokenError(error.message)) {
        await clearStaleSession(error.message);
      } else {
        console.log("[supabase] safeGetSession error", error.message);
      }
      return { userId: null };
    }
    return { userId: data.session?.user?.id ?? null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isInvalidRefreshTokenError(msg)) {
      await clearStaleSession(msg);
    } else {
      console.log("[supabase] safeGetSession exception", msg);
    }
    return { userId: null };
  }
}

export async function safeGetUser(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (isInvalidRefreshTokenError(error.message)) {
        await clearStaleSession(error.message);
      }
      return null;
    }
    return data.user?.id ?? null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isInvalidRefreshTokenError(msg)) {
      await clearStaleSession(msg);
    }
    return null;
  }
}

if (typeof supabase.auth.onAuthStateChange === "function") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED" && !session) {
      console.log("[supabase] token refresh produced no session, clearing");
      clearStaleSession("TOKEN_REFRESHED without session").catch(() => {});
    }
  });
}

let inflightEnsure: Promise<string | null> | null = null;

export async function ensureAnonymousSession(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  if (inflightEnsure) return inflightEnsure;
  inflightEnsure = (async () => {
    try {
      const { userId } = await safeGetSession();
      if (userId) {
        lastAuthError = null;
        return userId;
      }
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        if (isInvalidRefreshTokenError(error.message)) {
          await clearStaleSession(error.message);
          const retry = await supabase.auth.signInAnonymously();
          if (!retry.error) {
            lastAuthError = null;
            return retry.data.user?.id ?? null;
          }
        }
        console.log("[supabase] signInAnonymously error", error.message);
        lastAuthError = error.message;
        return null;
      }
      const uid = data.user?.id ?? null;
      lastAuthError = null;
      return uid;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log("[supabase] ensureAnonymousSession exception", msg);
      if (isInvalidRefreshTokenError(msg)) {
        await clearStaleSession(msg);
      }
      lastAuthError = msg;
      return null;
    } finally {
      inflightEnsure = null;
    }
  })();
  return inflightEnsure;
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = typeof atob === "function"
    ? atob(b64)
    : Buffer.from(b64, "base64").toString("binary");
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function guessContentType(ext: string): string {
  const e = ext.toLowerCase();
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "heic" || e === "heif") return "image/heic";
  return "image/jpeg";
}

export async function uploadPhoto(
  userId: string,
  which: "before" | "after",
  localUri: string
): Promise<{ path: string; url: string } | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const extMatch = localUri.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
    const ext = (extMatch?.[1] ?? "jpg").toLowerCase();
    const contentType = guessContentType(ext);
    const path = `${userId}/${which}-${Date.now()}.${ext}`;

    let body: Blob | ArrayBuffer;
    if (Platform.OS === "web") {
      let res: Response;
      try {
        res = await fetch(localUri);
      } catch (e) {
        console.log("[supabase] uploadPhoto fetch local uri failed", e);
        return null;
      }
      body = await res.blob();
    } else {
      const b64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      body = base64ToUint8Array(b64).buffer;
    }

    const { error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(path, body as ArrayBuffer, {
        contentType,
        upsert: true,
      });
    if (error) {
      console.log("[supabase] upload error", error.message);
      return null;
    }
    const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
    return { path, url: data.publicUrl };
  } catch (e) {
    console.log("[supabase] uploadPhoto failed", e);
    return null;
  }
}
