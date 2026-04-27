import { Platform } from "react-native";
import type Purchases from "react-native-purchases";
import type {
  PurchasesOffering,
  CustomerInfo,
  PurchasesPackage,
} from "react-native-purchases";

const ENTITLEMENT_ID = "Pro" as const;

const IOS_API_KEY_FALLBACK = "appl_zBhHRsyZhiWwsOxIhuqTDRnoiNp" as const;
const IOS_API_KEY: string =
  (process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "").length > 0
    ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY as string)
    : IOS_API_KEY_FALLBACK;
const ANDROID_API_KEY: string = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? "";

function resolveApiKey(): string {
  if (Platform.OS === "ios") return IOS_API_KEY;
  if (Platform.OS === "android") return ANDROID_API_KEY;
  return "";
}

function keyPrefix(key: string): string {
  if (!key) return "(empty)";
  return key.slice(0, 8);
}

export const isPurchasesSupported: boolean =
  Platform.OS === "ios" || Platform.OS === "android";

let initialized = false;
let configureCalled = false;
let initError: string | null = null;
let PurchasesRef: typeof Purchases | null = null;
let initPromise: Promise<boolean> | null = null;

export async function initPurchases(appUserId?: string | null): Promise<boolean> {
  if (!isPurchasesSupported) {
    console.log("[purchases] init skipped: platform not supported", Platform.OS);
    return false;
  }
  if (initPromise) return initPromise;
  if (initialized && PurchasesRef) {
    if (appUserId) {
      try {
        await PurchasesRef.logIn(appUserId);
      } catch (e) {
        console.log("[purchases] logIn error", e);
      }
    }
    return true;
  }

  initPromise = (async () => {
    const apiKey = resolveApiKey();
    if (!apiKey) {
      initError = `Missing RevenueCat API key for ${Platform.OS}. Ensure EXPO_PUBLIC_REVENUECAT_${Platform.OS === "ios" ? "IOS" : "ANDROID"}_API_KEY is set at build time.`;
      console.log("[purchases] " + initError);
      return false;
    }
    try {
      if (!PurchasesRef) {
        const mod = await import("react-native-purchases");
        PurchasesRef = mod.default;
      }
      PurchasesRef.configure({ apiKey, appUserID: appUserId ?? undefined });
      configureCalled = true;
      initialized = true;
      initError = null;
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      initError = msg;
      console.log("[purchases] init error", msg);
      return false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

async function ensureInitialized(): Promise<boolean> {
  if (initialized && PurchasesRef) return true;
  return initPurchases();
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!isPurchasesSupported) {
    console.log("[purchases] getCurrentOffering: platform not supported", Platform.OS);
    return null;
  }
  const ok = await ensureInitialized();
  if (!ok || !PurchasesRef) {
    console.log("[purchases] getCurrentOffering: init failed", initError);
    return null;
  }
  try {
    const offerings = await PurchasesRef.getOfferings();
    return offerings.current ?? null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[purchases] getOfferings error", msg);
    return null;
  }
}

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ ok: boolean; isPro: boolean; error?: string; userCancelled?: boolean }> {
  const ok = await ensureInitialized();
  if (!ok || !PurchasesRef) {
    return { ok: false, isPro: false, error: initError ?? "Purchases not available on this platform" };
  }
  try {
    const result = await PurchasesRef.purchasePackage(pkg);
    const isPro = Boolean(
      result.customerInfo.entitlements.active[ENTITLEMENT_ID]
    );
    return { ok: true, isPro };
  } catch (e) {
    const err = e as { userCancelled?: boolean; message?: string };
    if (err?.userCancelled) {
      return { ok: false, isPro: false, userCancelled: true };
    }
    const msg = err?.message ?? String(e);
    console.log("[purchases] purchase error", msg);
    return { ok: false, isPro: false, error: msg };
  }
}

export async function restorePurchases(): Promise<{ ok: boolean; isPro: boolean; error?: string }> {
  const ok = await ensureInitialized();
  if (!ok || !PurchasesRef) {
    return { ok: false, isPro: false, error: initError ?? "Restore not available on this platform" };
  }
  try {
    const info: CustomerInfo = await PurchasesRef.restorePurchases();
    const isPro = Boolean(info.entitlements.active[ENTITLEMENT_ID]);
    return { ok: true, isPro };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("[purchases] restore error", msg);
    return { ok: false, isPro: false, error: msg };
  }
}

export type RcDebugPackage = {
  pkgIdentifier: string;
  productIdentifier: string;
  priceString: string;
  price: number;
  currencyCode: string;
};

export type RcDebugInfo = {
  platform: string;
  initialized: boolean;
  configureCalled: boolean;
  apiKeyPresent: boolean;
  apiKeyLen: number;
  apiKeyPrefix: string;
  supported: boolean;
  hasCurrent: boolean;
  currentIdentifier: string | null;
  allOfferingKeys: string[];
  availablePackagesCount: number;
  packages: RcDebugPackage[];
  error: string | null;
};

export async function getRcDebugInfo(): Promise<RcDebugInfo> {
  const apiKey = resolveApiKey();
  const info: RcDebugInfo = {
    platform: Platform.OS,
    initialized: false,
    configureCalled: false,
    apiKeyPresent: apiKey.length > 0,
    apiKeyLen: apiKey.length,
    apiKeyPrefix: keyPrefix(apiKey),
    supported: isPurchasesSupported,
    hasCurrent: false,
    currentIdentifier: null,
    allOfferingKeys: [],
    availablePackagesCount: 0,
    packages: [],
    error: null,
  };
  if (!isPurchasesSupported) {
    info.error = "Platform not supported";
    return info;
  }
  try {
    await ensureInitialized();
    info.initialized = initialized;
    info.configureCalled = configureCalled;
    if (!PurchasesRef || !initialized) {
      info.error = initError ?? "RevenueCat not initialized";
      return info;
    }
    const offerings = await PurchasesRef.getOfferings();
    info.allOfferingKeys = Object.keys(offerings.all ?? {});
    const current = offerings.current ?? null;
    info.hasCurrent = Boolean(current);
    info.currentIdentifier = current?.identifier ?? null;
    info.availablePackagesCount = current?.availablePackages?.length ?? 0;
    if (current) {
      info.packages = current.availablePackages.map((p) => ({
        pkgIdentifier: p.identifier,
        productIdentifier: p.product.identifier,
        priceString: p.product.priceString,
        price: p.product.price,
        currencyCode: p.product.currencyCode,
      }));
    }
  } catch (e) {
    info.error = e instanceof Error ? e.message : String(e);
  }
  return info;
}

export async function getIsPro(): Promise<boolean> {
  const ok = await ensureInitialized();
  if (!ok || !PurchasesRef) return false;
  try {
    const info = await PurchasesRef.getCustomerInfo();
    return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
  } catch (e) {
    console.log("[purchases] getCustomerInfo error", e);
    return false;
  }
}
