import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Crown, X } from "lucide-react-native";
import type { PurchasesPackage } from "react-native-purchases";
import * as Linking from "expo-linking";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import {
  getCurrentOffering,
  isPurchasesSupported,
  purchasePackage,
  restorePurchases,
} from "@/lib/purchases";
import { PRIVACY_URL, TERMS_URL } from "@/constants/legal";

type PlanId = "monthly" | "yearly";

const FEATURES: string[] = [
  "All challenges & premium plans unlocked",
  "Personalized plans for your focus areas",
  "90-day Transformation program",
  "Never lose your streak (Pro protection)",
  "Deep progress insights & performance stats",
  "Join unlimited groups & compete on leaderboards",
];

function formatPrice(pkg: PurchasesPackage | undefined): string {
  if (!pkg) return "";
  const product = pkg.product;
  return product.priceString;
}

export default function PaywallScreen() {
  const { setPremium } = useApp();
  const [selected, setSelected] = useState<PlanId>("yearly");

  const offeringQuery = useQuery({
    queryKey: ["rc-offering"],
    queryFn: async () => {
      if (!isPurchasesSupported) return null;
      return getCurrentOffering();
    },
    staleTime: 30 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  const yearlyPkg = useMemo<PurchasesPackage | undefined>(() => {
    const off = offeringQuery.data;
    if (!off) return undefined;
    return off.annual ?? off.availablePackages.find((p) => p.identifier === "$rc_annual");
  }, [offeringQuery.data]);

  const monthlyPkg = useMemo<PurchasesPackage | undefined>(() => {
    const off = offeringQuery.data;
    if (!off) return undefined;
    return off.monthly ?? off.availablePackages.find((p) => p.identifier === "$rc_monthly");
  }, [offeringQuery.data]);

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => purchasePackage(pkg),
    onSuccess: (res) => {
      if (res.userCancelled) return;
      if (!res.ok) {
        Alert.alert("Purchase failed", res.error ?? "Please try again.");
        return;
      }
      setPremium(res.isPro);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      try { router.dismissAll(); } catch (_) {}
      router.replace("/(tabs)");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Purchase failed", msg);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => restorePurchases(),
    onSuccess: (res) => {
      if (!res.ok) {
        Alert.alert("Restore failed", res.error ?? "We couldn't restore purchases.");
        return;
      }
      setPremium(res.isPro);
      if (res.isPro) {
        Alert.alert("Welcome back", "Your Pro subscription has been restored.");
        try { router.dismissAll(); } catch (_) {}
        router.replace("/(tabs)");
      } else {
        Alert.alert("No active subscription", "We couldn't find an active subscription on this account.");
      }
    },
  });

  const onStart = async () => {
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    if (!isPurchasesSupported) {
      if (__DEV__) {
        setPremium(true);
        try { router.dismissAll(); } catch (_) {}
        router.replace("/(tabs)");
        return;
      }
      Alert.alert(
        "Not available on web",
        "Subscriptions are only available inside the iOS or Android app. Please open OnStreak on your device to subscribe."
      );
      return;
    }
    const pkg = selected === "yearly" ? yearlyPkg : monthlyPkg;
    if (!pkg) {
      Alert.alert(
        "Not available",
        "This subscription isn't available right now. Please try again shortly."
      );
      return;
    }
    purchaseMutation.mutate(pkg);
  };

  const loading = offeringQuery.isLoading;
  const purchasing = purchaseMutation.isPending;
  const restoring = restoreMutation.isPending;

  const yearlyLabel = yearlyPkg ? formatPrice(yearlyPkg) : "—";
  const monthlyLabel = monthlyPkg ? formatPrice(monthlyPkg) : "—";
  const yearlyMonthlyEquivalent = useMemo<string | null>(() => {
    if (!yearlyPkg) return null;
    const price = yearlyPkg.product.price;
    const code = yearlyPkg.product.currencyCode ?? "USD";
    if (typeof price !== "number" || price <= 0) return null;
    const monthly = price / 12;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        maximumFractionDigits: 2,
      }).format(monthly);
    } catch (_e) {
      return `${monthly.toFixed(2)} ${code}`;
    }
  }, [yearlyPkg]);
  const selectedLabel = selected === "yearly" ? `${yearlyLabel}/year` : `${monthlyLabel}/month`;
  const pricesReady = Boolean(yearlyPkg && monthlyPkg);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#2A1810", "#0A0A0B"]}
        style={StyleSheet.absoluteFill}
      />
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        testID="close-paywall"
      >
        <X color={Colors.text} size={20} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.crown}>
          <Crown color={Colors.accent} size={28} />
        </View>
        <Text style={styles.title}>OnStreak Pro</Text>
        <Text style={styles.subtitle}>
          Stay consistent. See real results.{"\n"}
          {pricesReady
            ? `7-day free trial, then ${monthlyLabel}/month or ${yearlyLabel}/year.`
            : "7-day free trial included."}
        </Text>

        <Text style={styles.featuresHeader}>Go further. Stay OnStreak.</Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <View style={styles.checkWrap}>
                <Check color={Colors.primary} size={14} strokeWidth={3} />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.planCard,
            selected === "yearly" && styles.planCardActive,
          ]}
          onPress={() => setSelected("yearly")}
          activeOpacity={0.9}
          testID="plan-yearly"
        >
          <View style={styles.bestBadge}>
            <Text style={styles.bestBadgeText}>BEST VALUE</Text>
          </View>
          <View style={styles.planTop}>
            <Text style={styles.planName}>Yearly</Text>
            <View style={styles.radio}>
              {selected === "yearly" && <View style={styles.radioDot} />}
            </View>
          </View>
          <Text style={styles.planPrice}>
            {yearlyPkg ? `${yearlyLabel} / year` : "Loading…"}
          </Text>
          {yearlyMonthlyEquivalent ? (
            <Text style={styles.planEquivalent}>
              {yearlyMonthlyEquivalent}/month billed annually
            </Text>
          ) : null}
          <Text style={styles.planSub}>
            7-day free trial · auto-renews yearly until canceled
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.planCard,
            selected === "monthly" && styles.planCardActive,
          ]}
          onPress={() => setSelected("monthly")}
          activeOpacity={0.9}
          testID="plan-monthly"
        >
          <View style={styles.planTop}>
            <Text style={styles.planName}>Monthly</Text>
            <View style={styles.radio}>
              {selected === "monthly" && <View style={styles.radioDot} />}
            </View>
          </View>
          <Text style={styles.planPrice}>
            {monthlyPkg ? `${monthlyLabel} / month` : "Loading…"}
          </Text>
          <Text style={styles.planSub}>7-day free trial · auto-renews monthly until canceled</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctaWrap}
          onPress={onStart}
          activeOpacity={0.85}
          disabled={purchasing || loading}
          testID="start-trial-btn"
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            {purchasing || loading ? (
              <ActivityIndicator color={Colors.text} />
            ) : (
              <Text style={styles.ctaText}>Start My Streak</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.ctaSubtext}>Most users lose their streak after 7 days</Text>

        {pricesReady && (
          <Text style={styles.renewalDisclosure}>
            7-day free trial, then {selectedLabel}. Auto-renews until canceled. Cancel anytime in your App Store account settings.
          </Text>
        )}

        {isPurchasesSupported && (
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={() => restoreMutation.mutate()}
            activeOpacity={0.7}
            disabled={restoring}
            testID="restore-btn"
          >
            <Text style={styles.restoreText}>
              {restoring ? "Restoring…" : "Restore purchases"}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.fineprint}>
          Cancel anytime before the trial ends and you won&apos;t be charged.
        </Text>

        <View style={styles.legalRow}>
          <TouchableOpacity
            onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}
            testID="paywall-terms"
          >
            <Text style={styles.legalLink}>Terms of Use</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
            testID="paywall-privacy"
          >
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 24, paddingTop: 72, paddingBottom: 60 },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  crown: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,182,39,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 22,
  },
  featuresHeader: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  features: { gap: 12, marginBottom: 28 },
  ctaSubtext: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
    fontWeight: "600",
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { color: Colors.text, fontSize: 14, fontWeight: "500", flex: 1 },
  planCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  planCardActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(255,107,53,0.08)",
  },
  bestBadge: {
    position: "absolute",
    top: -10,
    right: 14,
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bestBadgeText: {
    color: "#1A1004",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  planTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  planName: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  planPrice: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  planSub: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  planEquivalent: { color: Colors.primary, fontSize: 12, fontWeight: "700", marginTop: 2 },
  ctaWrap: { borderRadius: 16, overflow: "hidden", marginTop: 20 },
  cta: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  restoreBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  restoreText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  fineprint: {
    color: Colors.textDim,
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  renewalDisclosure: {
    color: Colors.textDim,
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  legalLink: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  legalDot: { color: Colors.textDim, fontSize: 12 },
});
