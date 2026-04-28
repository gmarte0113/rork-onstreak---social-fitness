import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { supabase } from "./supabase";

export type AuthResult = {
  ok: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
  provider?: "apple" | "google" | "email";
  firstName?: string;
};

WebBrowser.maybeCompleteAuthSession();

function friendlyAuthError(raw: string | undefined | null): string {
  const msg = (raw ?? "").toString();
  const lower = msg.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("network request failed") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("typeerror: fetch") ||
    lower === "typeerror: failed to fetch"
  ) {
    return "Can't reach the server. Check your internet connection and try again.";
  }
  return msg || "Something went wrong. Please try again.";
}

function parseHashParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const hashIndex = url.indexOf("#");
  if (hashIndex < 0) return out;
  const hash = url.slice(hashIndex + 1);
  for (const part of hash.split("&")) {
    const [k, v] = part.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return out;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<AuthResult> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: name ? { data: { name } } : undefined,
    });
    if (error) {
      console.log("[auth] signUp error", error.message);
      return { ok: false, error: friendlyAuthError(error.message), provider: "email" };
    }
    if (!data.session) {
      return {
        ok: false,
        needsEmailConfirmation: true,
        provider: "email",
        error: "Please check your email to confirm your account, then log in.",
      };
    }
    return { ok: true, provider: "email" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[auth] signUp exception", msg);
    return { ok: false, error: friendlyAuthError(msg) };
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    console.log("[auth][signInWithEmail] start", trimmedEmail, "url=", process.env.EXPO_PUBLIC_SUPABASE_URL);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    console.log("[auth][signInWithEmail] done", { hasSession: Boolean(data?.session), hasUser: Boolean(data?.user), error: error?.message, status: (error as { status?: number } | null)?.status });
    if (error) {
      console.log("[auth] signIn error full", JSON.stringify(error));
      return { ok: false, error: friendlyAuthError(error.message), provider: "email" };
    }
    return { ok: true, provider: "email" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[auth][signInWithEmail] caught", msg, e);
    return { ok: false, error: friendlyAuthError(msg) };
  }
}

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const redirectTo = Linking.createURL("auth-callback");
    console.log("[auth] google redirectTo", redirectTo);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== "web",
      },
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    if (Platform.OS === "web") {
      return { ok: true };
    }
    if (!data?.url) return { ok: false, error: "No auth URL returned" };
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== "success" || !res.url) {
      return { ok: false, error: "Sign in cancelled" };
    }
    const params = parseHashParams(res.url);
    const access_token = params.access_token;
    const refresh_token = params.refresh_token;
    if (!access_token || !refresh_token) {
      return { ok: false, error: "Missing tokens in callback" };
    }
    const { error: sErr } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sErr) return { ok: false, error: friendlyAuthError(sErr.message) };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[auth] google exception", msg);
    return { ok: false, error: friendlyAuthError(msg) };
  }
}

async function signInWithAppleOAuth(): Promise<AuthResult> {
  try {
    const redirectTo = Linking.createURL("auth-callback");
    console.log("[auth] apple oauth redirectTo", redirectTo);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== "web",
      },
    });
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    if (Platform.OS === "web") {
      return { ok: true };
    }
    if (!data?.url) return { ok: false, error: "No auth URL returned" };
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== "success" || !res.url) {
      return { ok: false, error: "Sign in cancelled" };
    }
    const params = parseHashParams(res.url);
    const access_token = params.access_token;
    const refresh_token = params.refresh_token;
    if (!access_token || !refresh_token) {
      return { ok: false, error: "Missing tokens in callback" };
    }
    const { error: sErr } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sErr) return { ok: false, error: friendlyAuthError(sErr.message) };
    return { ok: true, provider: "apple" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[auth] apple oauth exception", msg);
    return { ok: false, error: friendlyAuthError(msg) };
  }
}

export async function signInWithApple(): Promise<AuthResult> {
  if (Platform.OS !== "ios") {
    return signInWithAppleOAuth();
  }
  try {
    const AppleAuthentication = await import("expo-apple-authentication");
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      console.log("[auth] apple native unavailable, falling back to oauth");
      return signInWithAppleOAuth();
    }
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      return { ok: false, error: "No identity token from Apple", provider: "apple" };
    }
    const givenName = credential.fullName?.givenName?.trim() ?? "";
    const firstName = givenName.length > 0 ? givenName.split(/\s+/)[0] : undefined;
    console.log("[auth][apple] got identity token, firstName=", firstName);
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });
    console.log("[auth][apple] signInWithIdToken done", { hasSession: Boolean(data?.session), error: error?.message, status: (error as { status?: number } | null)?.status });
    if (error) {
      console.log("[auth][apple] error full", JSON.stringify(error));
      return { ok: false, error: friendlyAuthError(error.message), provider: "apple" };
    }
    if (firstName && data?.user?.id) {
      try {
        const { data: existing } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", data.user.id)
          .maybeSingle();
        const currentName = (existing as { name: string | null } | null)?.name?.trim() ?? "";
        if (!currentName) {
          const { error: upErr } = await supabase
            .from("profiles")
            .upsert(
              { user_id: data.user.id, name: firstName, updated_at: new Date().toISOString() },
              { onConflict: "user_id" },
            );
          if (upErr) console.log("[auth][apple] profile name upsert error", upErr.message);
        }
      } catch (e) {
        console.log("[auth][apple] persist firstName exception", e);
      }
    }
    return { ok: true, provider: "apple", firstName };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const lower = msg.toLowerCase();
    if (lower.includes("canceled") || lower.includes("cancelled")) {
      return { ok: false, error: "Sign in cancelled" };
    }
    const code = (e as { code?: string | number } | null)?.code;
    console.log("[auth] apple native exception, falling back to oauth", msg, code);
    if (
      lower.includes("not handled") ||
      lower.includes("unknown") ||
      lower.includes("1000") ||
      lower.includes("1001") ||
      lower.includes("not available") ||
      code === "ERR_REQUEST_UNKNOWN" ||
      code === "ERR_REQUEST_FAILED" ||
      code === 1000 ||
      code === 1001
    ) {
      return signInWithAppleOAuth();
    }
    return { ok: false, error: friendlyAuthError(msg) };
  }
}

export async function signOut(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false, error: friendlyAuthError(error.message) };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: friendlyAuthError(msg) };
  }
}
