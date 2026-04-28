import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowRight,
  ChevronLeft,
  Check,
  Heart,
  Dumbbell,
  Activity,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Contrast,
  Flame,
  Mail,
  Lock,
  User as UserIcon,
  Users,
  Zap,
  BarChart3,
  Bell,
  Camera,
  Rocket,
  Trophy,
  ShieldCheck,
  Sparkle,
  Minus,
} from "lucide-react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import type {
  Attempts,
  Blocker,
  NotificationPrefs,
  PlanSelected,
} from "@/providers/AppProvider";
import type { FitnessLevel, Goal } from "@/constants/workouts";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { PurchasesPackage } from "react-native-purchases";
import {
  signInWithApple,
  signInWithEmail,
  signUpWithEmail,
} from "@/lib/auth";
import { containsProfanity, getProfanityError } from "@/utils/profanity";
import AnimatedProgressBar from "@/components/AnimatedProgressBar";
import {
  getCurrentOffering,
  isPurchasesSupported,
  purchasePackage,
  restorePurchases,
} from "@/lib/purchases";
import { PRIVACY_URL, TERMS_URL } from "@/constants/legal";

type Step =
  | "welcome"
  | "signup"
  | "problem"
  | "solution"
  | "name"
  | "attempts"
  | "blockers"
  | "goal"
  | "level"
  | "ahaA"
  | "ahaB"
  | "bridge"
  | "reflection"
  | "notifications"
  | "paywall"
  | "invite"
  | "login";

const PROGRESS_VISIBLE: Step[] = [
  "name",
  "attempts",
  "blockers",
  "goal",
  "level",
  "reflection",
];

const PROGRESS_INDEX: Record<string, number> = {
  name: 0,
  attempts: 1,
  blockers: 2,
  goal: 3,
  level: 3,
  reflection: 3,
};

const ATTEMPTS_OPTIONS: { id: Attempts; title: string; desc: string }[] = [
  { id: "first", title: "This is my first try", desc: "Fresh start" },
  { id: "2-3", title: "2–3 times", desc: "A few false starts" },
  { id: "4-6", title: "4–6 times", desc: "I've been here before" },
  { id: "7+", title: "7+ times", desc: "Lost count, honestly" },
];

const BLOCKER_OPTIONS: { id: Blocker; title: string; desc: string }[] = [
  { id: "time", title: "Time", desc: "Days disappear before I notice" },
  { id: "motivation", title: "Motivation", desc: "I just don't feel like it" },
  { id: "soreness", title: "Soreness", desc: "I push too hard, then quit" },
  { id: "boredom", title: "Boredom", desc: "Same routine, every time" },
  { id: "life", title: "Life", desc: "Work, kids, travel, chaos" },
];

const GOAL_OPTIONS: {
  id: Goal;
  title: string;
  desc: string;
  Icon: React.ComponentType<{ color: string; size: number }>;
}[] = [
  { id: "lose_weight", title: "Lose weight", desc: "Burn calories, feel light", Icon: Heart },
  { id: "build_muscle", title: "Build muscle", desc: "Strength without the gym", Icon: Dumbbell },
  { id: "stay_active", title: "Stay active", desc: "Daily movement, daily wins", Icon: Activity },
];

const LEVEL_OPTIONS: {
  id: FitnessLevel;
  title: string;
  desc: string;
  bars: number;
}[] = [
  { id: "beginner", title: "Beginner", desc: "Just getting started — or starting again", bars: 1 },
  { id: "intermediate", title: "Intermediate", desc: "I work out a few times a week", bars: 2 },
  { id: "advanced" as FitnessLevel, title: "Advanced", desc: "Training is part of my routine", bars: 3 },
];

export default function Onboarding() {
  const {
    state,
    completeOnboarding,
    saveOnboardingAnswers,
    setNotificationsEnabled,
    setReminderTime,
    setPremium,
  } = useApp();

  useEffect(() => {
    if (state.onboarded) {
      console.log("[onboarding] already onboarded, redirecting");
      router.replace("/(tabs)");
    }
  }, [state.onboarded]);

  const [step, setStep] = useState<Step>("welcome");
  const [history, setHistory] = useState<Step[]>([]);

  const [name, setName] = useState<string>(state.userName ?? "");
  const [attempts, setAttempts] = useState<Attempts | null>(state.attempts ?? null);
  const [blockers, setBlockers] = useState<Blocker[]>(state.blockers ?? []);
  const [goal, setGoal] = useState<Goal | null>(state.goal ?? null);
  const [level, setLevel] = useState<FitnessLevel | null>(state.level ?? null);
  const [reminderH, setReminderH] = useState<number>(7);
  const [reminderM, setReminderM] = useState<number>(0);
  const [reminderAmPm, setReminderAmPm] = useState<"AM" | "PM">("AM");
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    dailyReminder: true,
    streakRescue: true,
    milestones: true,
  });
  const [plan, setPlan] = useState<"annual" | "monthly">("annual");
  const [showDowngrade, setShowDowngrade] = useState<boolean>(false);

  const offeringQuery = useQuery({
    queryKey: ["rc-offering", "onboarding"],
    queryFn: async () => {
      if (!isPurchasesSupported) return null;
      return getCurrentOffering();
    },
    staleTime: 30 * 1000,
    retry: 2,
  });

  const annualPkg = useMemo<PurchasesPackage | undefined>(() => {
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
    onSuccess: (res, pkg) => {
      if (res.userCancelled) return;
      if (!res.ok) {
        Alert.alert("Purchase failed", res.error ?? "Please try again.");
        return;
      }
      const chosen = pkg.identifier === "$rc_annual" ? "annual" : "monthly";
      saveOnboardingAnswers({ planSelected: chosen });
      setPremium(res.isPro);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      go("invite");
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
        go("invite");
      } else {
        Alert.alert("No active subscription", "We couldn't find an active subscription on this account.");
      }
    },
  });

  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<"apple" | "google" | "email" | null>(null);

  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;

  const haptic = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(style).catch(() => {});
    }
  };

  const animateTo = (next: Step) => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(slide, { toValue: -16, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
    ]).start(() => {
      setHistory((h) => [...h, step]);
      setStep(next);
      slide.setValue(16);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
      ]).start();
    });
  };

  const go = (next: Step) => {
    haptic();
    animateTo(next);
  };

  const goBack = () => {
    haptic();
    setHistory((h) => {
      const next = [...h];
      const prev = next.pop();
      if (prev) {
        Animated.parallel([
          Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: Platform.OS !== "web" }),
        ]).start(() => {
          setStep(prev);
          Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== "web" }).start();
        });
      }
      return next;
    });
  };

  const finishOnboarding = () => {
    if (goal && level) {
      saveOnboardingAnswers({
        name: name.trim(),
        attempts,
        blockers,
        goal,
        level,
        notificationPrefs: notifPrefs,
      });
      completeOnboarding(goal, level);
      router.replace("/(tabs)");
    } else {
      router.replace("/(tabs)");
    }
  };

  const onApple = async () => {
    haptic();
    setAuthError(null);
    setAuthLoading(true);
    const res = await signInWithApple();
    setAuthLoading(false);
    if (!res.ok) {
      setAuthError(res.error ?? "Apple sign in failed");
      return;
    }
    setAuthProvider("apple");
    const appleFirstName = res.firstName?.trim();
    if (appleFirstName) {
      console.log("[onboarding] apple firstName received", appleFirstName);
      setName(appleFirstName);
      saveOnboardingAnswers({ name: appleFirstName });
    }
    if (step === "signup") {
      animateTo("problem");
      return;
    }
    router.replace("/(tabs)");
  };

  const onEmailSignUp = async () => {
    haptic();
    setAuthError(null);
    const trimmed = authEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setAuthError("Enter a valid email address.");
      return;
    }
    if (authPassword.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    setAuthLoading(true);
    const res = await signUpWithEmail(authEmail, authPassword, name.trim() || undefined);
    setAuthLoading(false);
    if (!res.ok) {
      if (res.needsEmailConfirmation) {
        Alert.alert(
          "Check your email",
          res.error ?? "We sent you a confirmation link. You can keep going while you verify.",
        );
        animateTo("problem");
        return;
      }
      setAuthError(res.error ?? "Sign up failed");
      return;
    }
    animateTo("problem");
  };

  const onEmailLogin = async () => {
    haptic();
    setAuthError(null);
    if (!authEmail.trim() || authPassword.length < 1) {
      setAuthError("Enter your email and password.");
      return;
    }
    setAuthLoading(true);
    const res = await signInWithEmail(authEmail, authPassword);
    setAuthLoading(false);
    if (!res.ok) {
      setAuthError(res.error ?? "Login failed");
      return;
    }
    router.replace("/(tabs)");
  };

  const showProgress = PROGRESS_VISIBLE.includes(step);
  const progressFilled = PROGRESS_INDEX[step] ?? -1;

  const displayName = name.trim() || state.userName || "you";

  return (
    <View style={styles.root} testID="onboarding-root">
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={["#180A05", "#0A0A0B"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.7, y: 0 }}
          end={{ x: 0.3, y: 1 }}
        />
        <AnimatedGlow />
      </View>

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {showProgress && (
          <AnimatedProgressBar
            segments={5}
            filledIndex={progressFilled}
            style={styles.progressRow}
          />
        )}

        <Animated.View
          style={[
            styles.flex,
            { opacity: fade, transform: [{ translateY: slide }] },
          ]}
        >
          {step === "welcome" && (
            <WelcomeScreen
              onBegin={() => go("signup")}
              onLogin={() => go("login")}
            />
          )}
          {step === "signup" && (
            <SignUpScreen
              email={authEmail}
              password={authPassword}
              setEmail={setAuthEmail}
              setPassword={setAuthPassword}
              loading={authLoading}
              error={authError}
              onApple={onApple}
              onSubmit={onEmailSignUp}
              onLogin={() => go("login")}
              onSkip={() => go("problem")}
              onBack={goBack}
            />
          )}
          {step === "problem" && (
            <ProblemScreen onNext={() => go("solution")} onBack={goBack} />
          )}
          {step === "solution" && (
            <SolutionScreen
              onNext={() => go(authProvider === "apple" ? "attempts" : "name")}
              onBack={goBack}
            />
          )}
          {step === "name" && (
            <NameScreen
              name={name}
              setName={setName}
              onBack={goBack}
              onContinue={() => {
                const trimmed = name.trim();
                if (trimmed.length < 1) return;
                if (containsProfanity(trimmed)) {
                  Alert.alert("Choose another name", getProfanityError("username"));
                  return;
                }
                saveOnboardingAnswers({ name: trimmed });
                go("attempts");
              }}
            />
          )}
          {step === "attempts" && (
            <AttemptsScreen
              name={displayName}
              value={attempts}
              onSelect={(v) => {
                setAttempts(v);
                saveOnboardingAnswers({ attempts: v });
                setTimeout(() => go("blockers"), 220);
              }}
              onBack={goBack}
              onContinue={() => go("blockers")}
            />
          )}
          {step === "blockers" && (
            <BlockersScreen
              value={blockers}
              onToggle={(b) => {
                setBlockers((prev) => {
                  const next = prev.includes(b)
                    ? prev.filter((x) => x !== b)
                    : [...prev, b];
                  saveOnboardingAnswers({ blockers: next });
                  return next;
                });
              }}
              onBack={goBack}
              onContinue={() => blockers.length > 0 && go("goal")}
            />
          )}
          {step === "goal" && (
            <GoalScreen
              value={goal}
              onSelect={(g) => {
                setGoal(g);
                saveOnboardingAnswers({ goal: g });
                setTimeout(() => go("level"), 200);
              }}
              onBack={goBack}
              onContinue={() => go("level")}
            />
          )}
          {step === "level" && (
            <LevelScreen
              value={level}
              onSelect={(l) => {
                setLevel(l);
                saveOnboardingAnswers({ level: l });
                setTimeout(() => go("ahaA"), 220);
              }}
              onBack={goBack}
              onContinue={() => go("ahaA")}
            />
          )}
          {step === "ahaA" && (
            <AhaAScreen
              name={displayName}
              attempts={attempts}
              onNext={() => go("ahaB")}
              onBack={goBack}
            />
          )}
          {step === "ahaB" && (
            <AhaBScreen
              name={displayName}
              onNext={() => go("bridge")}
              onBack={goBack}
            />
          )}
          {step === "bridge" && (
            <BridgeScreen
              name={displayName}
              onNext={() => go("reflection")}
              onBack={goBack}
            />
          )}
          {step === "reflection" && (
            <ReflectionScreen
              name={displayName}
              attempts={attempts}
              blockers={blockers}
              goal={goal}
              level={level}
              onNext={() => go("notifications")}
              onBack={goBack}
            />
          )}
          {step === "notifications" && (
            <NotificationsScreen
              name={displayName}
              h={reminderH}
              m={reminderM}
              ampm={reminderAmPm}
              setH={setReminderH}
              setM={setReminderM}
              setAmPm={setReminderAmPm}
              prefs={notifPrefs}
              setPrefs={setNotifPrefs}
              onAllow={async () => {
                const hour24 =
                  reminderAmPm === "PM" && reminderH !== 12
                    ? reminderH + 12
                    : reminderAmPm === "AM" && reminderH === 12
                      ? 0
                      : reminderH;
                setReminderTime(hour24, reminderM);
                saveOnboardingAnswers({ notificationPrefs: notifPrefs });
                try {
                  await setNotificationsEnabled(true);
                } catch (e) {
                  console.log("notifications error", e);
                }
                go("paywall");
              }}
              onSkip={() => {
                saveOnboardingAnswers({ notificationPrefs: notifPrefs });
                go("paywall");
              }}
              onBack={goBack}
            />
          )}
          {step === "paywall" && (
            <PaywallScreen
              name={displayName}
              attempts={attempts}
              plan={plan}
              setPlan={setPlan}
              annualPkg={annualPkg}
              monthlyPkg={monthlyPkg}
              loadingPrices={offeringQuery.isLoading}
              purchasing={purchaseMutation.isPending}
              restoring={restoreMutation.isPending}
              onSubscribe={(p) => {
                haptic(Haptics.ImpactFeedbackStyle.Medium);
                if (!isPurchasesSupported) {
                  if (__DEV__) {
                    saveOnboardingAnswers({ planSelected: p });
                    setPremium(true);
                    go("invite");
                    return;
                  }
                  Alert.alert(
                    "Open on mobile",
                    "Subscriptions are only available inside the iOS or Android app.",
                  );
                  return;
                }
                const pkg = p === "annual" ? annualPkg : monthlyPkg;
                if (!pkg) {
                  Alert.alert(
                    "Not available",
                    "This subscription isn't available right now. Please try again shortly.",
                  );
                  return;
                }
                purchaseMutation.mutate(pkg);
              }}
              onRestore={() => restoreMutation.mutate()}
              onMaybeLater={() => setShowDowngrade(true)}
              onBack={goBack}
            />
          )}
          {step === "invite" && (
            <InviteScreen
              onInvite={async () => {
                haptic(Haptics.ImpactFeedbackStyle.Medium);
                try {
                  await Share.share({
                    message:
                      "Join me on OnStreak — 5-minute daily workouts to build a real streak. Download: https://onstreak.app",
                    url: "https://onstreak.app",
                    title: "Join me on OnStreak",
                  });
                } catch (e) {
                  console.log("share error", e);
                }
                finishOnboarding();
              }}
              onSkip={() => finishOnboarding()}
              onBack={goBack}
            />
          )}
          {step === "login" && (
            <LoginScreen
              email={authEmail}
              password={authPassword}
              setEmail={setAuthEmail}
              setPassword={setAuthPassword}
              loading={authLoading}
              error={authError}
              onApple={onApple}
              onSubmit={onEmailLogin}
              onBack={goBack}
            />
          )}
        </Animated.View>

        {showDowngrade && (
          <DowngradeModal
            onKeep={() => {
              setShowDowngrade(false);
              setPlan("annual");
              haptic(Haptics.ImpactFeedbackStyle.Medium);
            }}
            onContinueFree={() => {
              setShowDowngrade(false);
              saveOnboardingAnswers({ planSelected: "free" });
              go("invite");
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function AnimatedGlow() {
  const t1 = useRef(new Animated.Value(0)).current;
  const t2 = useRef(new Animated.Value(0)).current;
  const t3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (val: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(val, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== "web",
          }),
        ])
      );
    const a = loop(t1, 9000);
    const b = loop(t2, 13000);
    const c = loop(t3, 7000);
    a.start();
    b.start();
    c.start();
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [t1, t2, t3]);

  const translateX1 = t1.interpolate({ inputRange: [0, 1], outputRange: [-40, 60] });
  const translateY1 = t2.interpolate({ inputRange: [0, 1], outputRange: [-30, 40] });
  const scale1 = t3.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const opacity1 = t1.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.85] });

  const translateX2 = t2.interpolate({ inputRange: [0, 1], outputRange: [50, -70] });
  const translateY2 = t1.interpolate({ inputRange: [0, 1], outputRange: [60, -20] });
  const scale2 = t1.interpolate({ inputRange: [0, 1], outputRange: [1.1, 0.9] });
  const opacity2 = t3.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.glowOrb,
          {
            top: -160,
            right: -120,
            opacity: opacity1,
            transform: [
              { translateX: translateX1 },
              { translateY: translateY1 },
              { scale: scale1 },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(255,122,61,0.55)", "rgba(232,86,31,0.18)", "rgba(10,10,11,0)"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.glowOrb,
          {
            bottom: -180,
            left: -140,
            width: 460,
            height: 460,
            borderRadius: 230,
            opacity: opacity2,
            transform: [
              { translateX: translateX2 },
              { translateY: translateY2 },
              { scale: scale2 },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(255,107,53,0.45)", "rgba(232,86,31,0.12)", "rgba(10,10,11,0)"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.4, y: 0.4 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
    </View>
  );
}

function GradientButton({
  label,
  onPress,
  disabled,
  testID,
  iconRight,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  iconRight?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      style={[styles.cta, disabled && { opacity: 0.4 }]}
      testID={testID}
    >
      <View style={styles.ctaGlow} pointerEvents="none" />
      <LinearGradient
        colors={["#FF7A3D", "#E8561F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ctaInner}
      >
        <Text style={styles.ctaText}>{label}</Text>
        {iconRight ?? <ArrowRight color={Colors.text} size={20} />}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={12} style={styles.backBtn} testID="back-btn">
      <ChevronLeft color={Colors.textMuted} size={20} />
      <Text style={styles.backText}>Back</Text>
    </TouchableOpacity>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.stepLabel}>{children}</Text>;
}

function WelcomeScreen({
  onBegin,
  onLogin,
}: {
  onBegin: () => void;
  onLogin: () => void;
}) {
  return (
    <View style={styles.screenPad}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={[styles.brandRow, { marginBottom: 24 }]}>
          <Image
            source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/zo9z6o9js0b5a5fmtze9b.png" }}
            style={styles.brandIconImg}
            resizeMode="cover"
          />
          <Text style={styles.brandText}>OnStreak</Text>
        </View>
        <Text style={styles.preLabel}>A NEW WAY TO —</Text>
        <Text style={styles.megaLine}>SHOW</Text>
        <Text style={styles.megaLine}>UP</Text>
        <Text style={[styles.megaLine, styles.megaItalic, { color: Colors.primary }]}>DAILY.</Text>
        <View style={styles.welcomeSubRow}>
          <View style={styles.welcomeBar} />
          <Text style={styles.welcomeSub}>
            5-minute tasks. One streak. Built for people who&apos;ve started before — and quit.
          </Text>
        </View>
      </View>
      <GradientButton label="Begin" onPress={onBegin} testID="welcome-begin" />
      <TouchableOpacity onPress={onLogin} style={styles.welcomeLogin} testID="welcome-login">
        <Text style={styles.welcomeLoginText}>
          Already a member? <Text style={{ color: Colors.primary, fontWeight: "800" }}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ProblemScreen({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <View style={styles.screenPad}>
      <BackBtn onPress={onBack} />
      <View style={{ flex: 1, justifyContent: "center" }}>
        <StepLabel>THE HONEST TRUTH</StepLabel>
        <Text style={styles.bigTitle}>You&apos;ve started before.</Text>
        <Text style={[styles.bigTitle, { color: Colors.textMuted }]}>
          Then life got in the way.
        </Text>
        <Text style={styles.body}>
          A new gym. A new app. A burst of motivation. Then a missed day. Then a missed week. Then back to square one.
        </Text>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Text style={styles.statHeaderLabel}>YOUR LAST 12{"\n"}WEEKS</Text>
            <Text style={styles.statBigNumber}>
              9 <Text style={styles.statBigSuffix}>RESETS</Text>
            </Text>
          </View>
          <View style={styles.barsRow}>
            {[40, 70, 50, 6, 60, 30, 6, 35, 6, 28, 6, 30].map((h, i) => {
              const broken = h <= 8;
              return (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      height: Math.max(8, h),
                      backgroundColor: broken ? Colors.primary : "#3A3A40",
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.barsAxis}>
            <Text style={styles.axisText}>JAN</Text>
            <View style={styles.brokenBadge}>
              <View style={styles.brokenDot} />
              <Text style={styles.brokenText}>BROKEN{"\n"}WEEKS</Text>
            </View>
            <Text style={styles.axisText}>MAR</Text>
          </View>
        </View>
      </View>
      <GradientButton label="I feel seen" onPress={onNext} testID="problem-next" />
    </View>
  );
}

function SolutionScreen({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <View style={styles.screenPad}>
      <BackBtn onPress={onBack} />
      <View style={{ flex: 1, justifyContent: "center" }}>
        <StepLabel>HERE&apos;S THE FIX</StepLabel>
        <Text style={styles.bigTitle}>One small task.</Text>
        <Text style={[styles.bigTitle, { color: Colors.primary }]}>
          Every single day.
        </Text>
        <Text style={styles.body}>
          OnStreak gives you one workout a day — small enough to never skip, big enough to add up.
        </Text>
        <View style={styles.taskCard}>
          <View style={styles.taskIconWrap}>
            <Flame color={Colors.primary} size={22} fill={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.taskTitle}>Today&apos;s task</Text>
            <Text style={styles.taskSub}>20 push-ups · 4 minutes</Text>
          </View>
          <View style={styles.taskCheck}>
            <Check color={Colors.text} size={16} strokeWidth={3} />
          </View>
        </View>
      </View>
      <GradientButton label="Show me how" onPress={onNext} testID="solution-next" />
    </View>
  );
}

function NameScreen({
  name,
  setName,
  onBack,
  onContinue,
}: {
  name: string;
  setName: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <View style={styles.screenPad}>
        <BackBtn onPress={onBack} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <StepLabel>STEP 1 OF 8</StepLabel>
          <Text style={styles.title}>What should we call you?</Text>
          <Text style={styles.sub}>We&apos;ll use it across the app to keep things personal.</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={Colors.textDim}
            autoFocus
            autoCapitalize="words"
            maxLength={24}
            returnKeyType="done"
            onSubmitEditing={onContinue}
            testID="name-input"
          />
        </View>
        <GradientButton
          label="Continue"
          onPress={onContinue}
          disabled={name.trim().length < 1}
          testID="name-continue"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function OptionCard({
  selected,
  onPress,
  title,
  desc,
  iconLeft,
  iconRight,
  testID,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  desc?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && { opacity: 0.85 },
      ]}
      testID={testID}
    >
      {iconLeft ? <View style={styles.optionLeftIcon}>{iconLeft}</View> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        {desc ? <Text style={styles.optionDesc}>{desc}</Text> : null}
      </View>
      {iconRight ?? (selected ? <CheckCircle /> : null)}
    </Pressable>
  );
}

function CheckCircle() {
  return (
    <View style={styles.checkCircle}>
      <Check color={Colors.text} size={14} strokeWidth={3} />
    </View>
  );
}

function AttemptsScreen({
  name,
  value,
  onSelect,
  onBack,
  onContinue,
}: {
  name: string;
  value: Attempts | null;
  onSelect: (v: Attempts) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.screenPad}
      keyboardShouldPersistTaps="handled"
    >
      <BackBtn onPress={onBack} />
      <View style={{ flex: 1, justifyContent: "center" }}>
        <StepLabel>STEP 2 OF 8</StepLabel>
        <Text style={styles.title}>
          Be honest, <Text style={{ color: Colors.primary }}>{name}</Text>. How many times have you started a fitness habit and stopped?
        </Text>
        <Text style={styles.sub}>No judgment. This helps us calibrate.</Text>
        <View style={{ gap: 12, marginTop: 8 }}>
          {ATTEMPTS_OPTIONS.map((o) => (
            <OptionCard
              key={o.id}
              selected={value === o.id}
              onPress={() => {
                onSelect(o.id);
              }}
              title={o.title}
              desc={o.desc}
              testID={`attempts-${o.id}`}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function BlockersScreen({
  value,
  onToggle,
  onBack,
  onContinue,
}: {
  value: Blocker[];
  onToggle: (b: Blocker) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.screenPad}
      keyboardShouldPersistTaps="handled"
    >
      <BackBtn onPress={onBack} />
      <View style={{ flex: 1, justifyContent: "center" }}>
        <StepLabel>STEP 3 OF 8</StepLabel>
        <Text style={styles.title}>What gets in the way?</Text>
        <Text style={styles.sub}>Pick all that hit home.</Text>
        <View style={{ gap: 12, marginTop: 8 }}>
          {BLOCKER_OPTIONS.map((o) => (
            <OptionCard
              key={o.id}
              selected={value.includes(o.id)}
              onPress={() => onToggle(o.id)}
              title={o.title}
              desc={o.desc}
              testID={`blocker-${o.id}`}
            />
          ))}
        </View>
      </View>
      <View style={{ height: 24 }} />
      <GradientButton label="Continue" onPress={onContinue} disabled={value.length === 0} />
    </ScrollView>
  );
}

function GoalScreen({
  value,
  onSelect,
  onBack,
  onContinue,
}: {
  value: Goal | null;
  onSelect: (g: Goal) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.screenPad}>
      <BackBtn onPress={onBack} />
      <View style={{ flex: 1, justifyContent: "center" }}>
        <StepLabel>STEP 4 OF 8</StepLabel>
        <Text style={styles.title}>What&apos;s your goal?</Text>
        <Text style={styles.sub}>Pick one. You can change it later.</Text>
        <View style={{ gap: 12, marginTop: 8 }}>
          {GOAL_OPTIONS.map((g) => {
          const Icon = g.Icon;
          return (
            <OptionCard
              key={g.id}
              selected={value === g.id}
              onPress={() => {
                onSelect(g.id);
              }}
              title={g.title}
              desc={g.desc}
              iconLeft={
                <View style={styles.optionIconBg}>
                  <Icon color={Colors.primary} size={20} />
                </View>
              }
              testID={`goal-${g.id}`}
            />
          );
          })}
        </View>
      </View>
    </View>
  );
}

function LevelBars({ active, total = 3 }: { active: number; total?: number }) {
  return (
    <View style={styles.levelBars}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.levelBar,
            i < active ? { backgroundColor: Colors.primary } : { backgroundColor: "#3A3A40" },
          ]}
        />
      ))}
    </View>
  );
}

function LevelScreen({
  value,
  onSelect,
  onBack,
  onContinue,
}: {
  value: FitnessLevel | null;
  onSelect: (l: FitnessLevel) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.screenPad}>
      <BackBtn onPress={onBack} />
      <View style={{ flex: 1, justifyContent: "center" }}>
        <StepLabel>STEP 5 OF 8</StepLabel>
        <Text style={styles.title}>How fit are you right now?</Text>
        <Text style={styles.sub}>We&apos;ll calibrate every task to match. No ego required.</Text>
        <View style={{ gap: 12, marginTop: 8 }}>
          {LEVEL_OPTIONS.map((l) => (
            <OptionCard
              key={l.id}
              selected={value === l.id}
              onPress={() => {
                onSelect(l.id);
              }}
              title={l.title}
              desc={l.desc}
              iconRight={<LevelBars active={l.bars} />}
              testID={`level-${l.id}`}
            />
          ))}
        </View>
        <View style={styles.greenInsight}>
          <Text style={styles.greenInsightText}>
            <Text style={{ color: "#22C55E", fontWeight: "800" }}>Good news:</Text>{" "}
            Beginners hit 30-day streaks at <Text style={{ fontWeight: "800", color: Colors.text }}>2.4× the rate</Text> of people who jump in too hard.
          </Text>
        </View>
      </View>
    </View>
  );
}

function attemptsToCount(a: Attempts | null): number {
  switch (a) {
    case "first":
      return 1;
    case "2-3":
      return 3;
    case "4-6":
      return 5;
    case "7+":
      return 8;
    default:
      return 5;
  }
}

function AhaAScreen({
  name,
  attempts,
  onNext,
  onBack,
}: {
  name: string;
  attempts: Attempts | null;
  onNext: () => void;
  onBack: () => void;
}) {
  const tries = attemptsToCount(attempts);
  return (
    <View style={styles.screenPad}>
      <BackBtn onPress={onBack} />
      <View style={{ flex: 1, justifyContent: "center" }}>
        <StepLabel>BASED ON YOUR ANSWERS</StepLabel>
        <Text style={styles.megaStat}>92%</Text>
        <Text style={styles.bigTitle}>
          of people who download a fitness app quit within{" "}
          <Text style={{ color: Colors.primary }}>3 days</Text>.
        </Text>
        <Text style={styles.body}>
          {tries === 1 ? "First try" : `${tries} times you've tried`}, {name}. That&apos;s not a willpower problem — that&apos;s a system problem.
        </Text>
        <View style={styles.gridCard}>
          <View style={styles.gridHeader}>
            <Text style={styles.gridLabel}>OUT OF EVERY{"\n"}100</Text>
            <Text style={styles.gridStick}>
              8 <Text style={styles.gridStickSuffix}>STICK</Text>
            </Text>
          </View>
          <DotGrid />
          <View style={styles.gridLegend}>
            <Text style={styles.legendDim}>QUIT IN 3{"\n"}DAYS</Text>
            <View style={styles.legendMid}>
              <View style={styles.legendDot} />
              <Text style={styles.legendMidText}>THE 8% WHO{"\n"}STICK</Text>
            </View>
            <Text style={styles.legendBright}>YOU CAN BE{"\n"}ONE</Text>
          </View>
        </View>
      </View>
      <GradientButton label="That's me. What now?" onPress={onNext} testID="aha-a-next" />
    </View>
  );
}

function DotGrid() {
  const rows = 5;
  const cols = 20;
  const stickCount = 8;
  return (
    <View style={styles.dotGrid}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={styles.dotRow}>
          {Array.from({ length: cols }).map((__, c) => {
            const idx = r * cols + c;
            const isStick = idx < stickCount;
            return (
              <View
                key={c}
                style={[
                  styles.dot,
                  { backgroundColor: isStick ? Colors.primary : "#3A3A40" },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function AhaBScreen({
  name,
  onNext,
  onBack,
}: {
  name: string;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.screenPad}>
      <BackBtn onPress={onBack} />
      <View style={{ flex: 1, justifyContent: "center" }}>
        <StepLabel>BASED ON YOUR ANSWERS</StepLabel>
        <Text style={styles.bigTitle}>{name}, here&apos;s the math.</Text>
        <View style={styles.mathCard}>
          <Text style={styles.mathLabel}>5 MIN/DAY × 365 DAYS</Text>
          <Text style={styles.mathBig}>30 hours</Text>
          <Text style={styles.mathSub}>of training, in a year.</Text>
        </View>
        <View style={[styles.mathCard, { opacity: 0.7 }]}>
          <Text style={styles.mathLabel}>QUITTING AFTER 3 DAYS</Text>
          <Text style={[styles.mathBig, { color: Colors.textMuted }]}>0 hours</Text>
          <Text style={styles.mathSub}>what 92% of people do.</Text>
        </View>
        <Text style={[styles.body, { marginTop: 22 }]}>
          The gap between fit and unfit isn&apos;t talent. It&apos;s{" "}
          <Text style={{ color: Colors.text, fontWeight: "800" }}>showing up.</Text>
        </Text>
      </View>
      <GradientButton label="Show me my plan" onPress={onNext} testID="aha-b-next" />
    </View>
  );
}

function BridgeScreen({
  name,
  onNext,
  onBack,
}: {
  name: string;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.screenPad}>
      <BackBtn onPress={onBack} />
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={styles.greenCircle}>
          <Check color="#22C55E" size={28} strokeWidth={3} />
        </View>
        <Text style={styles.bigTitle}>It doesn&apos;t have to be this way.</Text>
        <Text style={styles.body}>
          The people who stick aren&apos;t more disciplined than you, {name}. They have a system that makes showing up the easy choice.
        </Text>
        <Text style={[styles.body, { color: Colors.text, fontWeight: "800", marginTop: 18 }]}>
          Let&apos;s build yours.
        </Text>
      </View>
      <GradientButton label="Build my plan" onPress={onNext} testID="bridge-next" />
    </View>
  );
}

function ReflectionScreen({
  name,
  attempts,
  blockers,
  goal,
  level,
  onNext,
  onBack,
}: {
  name: string;
  attempts: Attempts | null;
  blockers: Blocker[];
  goal: Goal | null;
  level: FitnessLevel | null;
  onNext: () => void;
  onBack: () => void;
}) {
  const attemptsLabel = useMemo(() => {
    const found = ATTEMPTS_OPTIONS.find((a) => a.id === attempts);
    return found?.title ?? "—";
  }, [attempts]);
  const blockersLabel = useMemo(() => {
    if (blockers.length === 0) return "—";
    return blockers
      .map((b) => BLOCKER_OPTIONS.find((x) => x.id === b)?.title?.toLowerCase() ?? b)
      .join(" + ");
  }, [blockers]);
  const goalLabel = useMemo(() => {
    if (goal === "stay_active") return "Stay active, not transform";
    return GOAL_OPTIONS.find((g) => g.id === goal)?.title ?? "—";
  }, [goal]);
  const levelLabel = useMemo(
    () => LEVEL_OPTIONS.find((l) => l.id === level)?.title ?? "—",
    [level]
  );
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.screenPad}>
      <BackBtn onPress={onBack} />
      <View style={{ flex: 1, justifyContent: "center" }}>
        <StepLabel>WE HEAR YOU</StepLabel>
        <Text style={styles.title}>Here&apos;s the {name} we&apos;re designing for:</Text>
        <Text style={styles.sub}>You told us, in your own words.</Text>
        <View style={{ gap: 10, marginTop: 12 }}>
          <ReflectionRow icon={<RefreshCw color={Colors.primary} size={18} />} label="TRIED BEFORE" value={attemptsLabel} />
          <ReflectionRow icon={<AlertCircle color={Colors.primary} size={18} />} label="BIGGEST BLOCKER" value={blockersLabel} />
          <ReflectionRow icon={<Sparkles color={Colors.primary} size={18} />} label="GOAL" value={goalLabel} />
          <ReflectionRow icon={<Contrast color={Colors.primary} size={18} />} label="FITNESS LEVEL" value={levelLabel} />
        </View>
        <View style={styles.foundationCard}>
          <Text style={styles.foundationText}>
            <Text style={{ color: Colors.text, fontWeight: "800" }}>Sound right?</Text>{" "}
            This becomes the foundation of your plan.
          </Text>
        </View>
      </View>
      <View style={{ height: 20 }} />
      <GradientButton label="Yes, that's me" onPress={onNext} testID="reflection-next" />
    </ScrollView>
  );
}

function ReflectionRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.refRow}>
      <View style={styles.refIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.refLabel}>{label}</Text>
        <Text style={styles.refValue}>{value}</Text>
      </View>
    </View>
  );
}

function NotificationsScreen({
  name,
  h,
  m,
  ampm,
  setH,
  setM,
  setAmPm,
  prefs,
  setPrefs,
  onAllow,
  onSkip,
  onBack,
}: {
  name: string;
  h: number;
  m: number;
  ampm: "AM" | "PM";
  setH: (v: number) => void;
  setM: (v: number) => void;
  setAmPm: (v: "AM" | "PM") => void;
  prefs: NotificationPrefs;
  setPrefs: (p: NotificationPrefs) => void;
  onAllow: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.screenPad}>
      <BackBtn onPress={onBack} />
      <View style={{ height: 30 }} />
      <StepLabel>ONE LAST THING, {name.toUpperCase()}</StepLabel>
      <Text style={styles.title}>When should we nudge you?</Text>
      <Text style={styles.sub}>One reminder a day to keep your streak alive.</Text>

      <View style={styles.timeWrap}>
        <TimeWheel value={h} onChange={setH} min={1} max={12} pad />
        <Text style={styles.timeColon}>:</Text>
        <TimeWheel value={m} onChange={setM} min={0} max={59} pad step={15} />
        <AmPmToggle value={ampm} onChange={setAmPm} />
      </View>

      <View style={styles.prefsCard}>
        <PrefRow
          on={prefs.dailyReminder}
          onToggle={() => setPrefs({ ...prefs, dailyReminder: !prefs.dailyReminder })}
          title="Daily check-in reminder"
          desc="1 ping at your time, that's it"
        />
        <View style={styles.prefDivider} />
        <PrefRow
          on={prefs.streakRescue}
          onToggle={() => setPrefs({ ...prefs, streakRescue: !prefs.streakRescue })}
          title="Streak rescue"
          desc="Heads-up if you're about to break it"
        />
        <View style={styles.prefDivider} />
        <PrefRow
          on={prefs.milestones}
          onToggle={() => setPrefs({ ...prefs, milestones: !prefs.milestones })}
          title="Milestone celebrations"
          desc="When you hit 7, 30, 90 days"
        />
      </View>

      <GradientButton label="Allow notifications" onPress={onAllow} testID="notif-allow" />
      <TouchableOpacity onPress={onSkip} style={styles.skip} testID="notif-skip">
        <Text style={styles.skipText}>Maybe later</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function PrefRow({
  on,
  onToggle,
  title,
  desc,
}: {
  on: boolean;
  onToggle: () => void;
  title: string;
  desc: string;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.prefRow}>
      <View style={[styles.prefCheck, on && styles.prefCheckOn]}>
        {on ? <Check color={Colors.primary} size={14} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.prefTitle}>{title}</Text>
        <Text style={styles.prefDesc}>{desc}</Text>
      </View>
    </Pressable>
  );
}

const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_COUNT = 3;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_COUNT;

function TimeWheel({
  value,
  onChange,
  min,
  max,
  pad,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  pad?: boolean;
  step?: number;
}) {
  const fmt = (v: number) => (pad ? String(v).padStart(2, "0") : String(v));
  const items = useMemo(() => {
    const arr: number[] = [];
    for (let i = min; i <= max; i += step) arr.push(i);
    return arr;
  }, [min, max, step]);
  const scrollRef = useRef<ScrollView>(null);
  const lastValueRef = useRef<number>(value);

  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx >= 0 && scrollRef.current && lastValueRef.current !== value) {
      lastValueRef.current = value;
      scrollRef.current.scrollTo({ y: idx * WHEEL_ITEM_HEIGHT, animated: true });
    }
  }, [value, items]);

  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx >= 0 && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: idx * WHEEL_ITEM_HEIGHT, animated: false });
      });
    }
     
  }, []);

  const handleMomentumEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / WHEEL_ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    const newVal = items[clamped];
    if (newVal !== value) {
      lastValueRef.current = newVal;
      if (Platform.OS !== "web") {
        Haptics.selectionAsync().catch(() => {});
      }
      onChange(newVal);
    }
  };

  return (
    <View style={styles.wheel}>
      <View style={styles.wheelHighlight} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT }}
        style={styles.wheelScroll}
        nestedScrollEnabled
      >
        {items.map((it) => {
          const active = it === value;
          return (
            <View key={it} style={styles.wheelItem}>
              <Text style={[styles.wheelItemText, active && styles.wheelItemTextActive]}>
                {fmt(it)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function AmPmToggle({
  value,
  onChange,
}: {
  value: "AM" | "PM";
  onChange: (v: "AM" | "PM") => void;
}) {
  return (
    <View style={styles.ampm}>
      <Pressable onPress={() => onChange("AM")}>
        <Text style={[styles.ampmGhost, value === "AM" && styles.ampmActive]}>AM</Text>
      </Pressable>
      <Pressable onPress={() => onChange("PM")}>
        <Text style={[styles.ampmGhost, value === "PM" && styles.ampmActive]}>PM</Text>
      </Pressable>
    </View>
  );
}

function PaywallScreen({
  name,
  attempts,
  plan,
  setPlan,
  annualPkg,
  monthlyPkg,
  loadingPrices,
  purchasing,
  restoring,
  onSubscribe,
  onRestore,
  onMaybeLater,
  onBack,
}: {
  name: string;
  attempts: Attempts | null;
  plan: "annual" | "monthly";
  setPlan: (p: "annual" | "monthly") => void;
  annualPkg: PurchasesPackage | undefined;
  monthlyPkg: PurchasesPackage | undefined;
  loadingPrices: boolean;
  purchasing: boolean;
  restoring: boolean;
  onSubscribe: (p: "annual" | "monthly") => void;
  onRestore: () => void;
  onMaybeLater: () => void;
  onBack: () => void;
}) {
  const tries = attemptsToCount(attempts);
  const annualLabel = annualPkg?.product.priceString ?? (loadingPrices ? "Loading\u2026" : "\u2014");
  const monthlyLabel = monthlyPkg?.product.priceString ?? (loadingPrices ? "Loading\u2026" : "\u2014");
  const annualMonthlyEquivalent: string | null = (() => {
    if (!annualPkg) return null;
    const price = annualPkg.product.price;
    const code = annualPkg.product.currencyCode ?? "USD";
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
  })();
  const handlePick = (p: "annual" | "monthly") => {
    if (purchasing) return;
    setPlan(p);
    onSubscribe(p);
  };
  return (
    <ScrollView style={styles.flex} contentContainerStyle={[styles.screenPad, { paddingTop: 4, paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
      <BackBtn onPress={onBack} />
      <StepLabel>RECOMMENDED FOR YOU, {name.toUpperCase()}</StepLabel>
      <Text style={[styles.title, { fontSize: 26, lineHeight: 32 }]}>Start with everything unlocked.</Text>
      <Text style={[styles.sub, { marginBottom: 14 }]}>
        You&apos;ve tried {tries} times. Pro users are{" "}
        <Text style={{ color: Colors.text, fontWeight: "800" }}>2.4× more likely</Text> to hit 30 days.
      </Text>

      <View style={[styles.proCard, { marginTop: 8, padding: 14 }]}>
        <View style={styles.trialBadge}>
          <Text style={styles.trialBadgeText}>7-DAY FREE TRIAL</Text>
        </View>
        <View style={[styles.proHeader, { marginTop: 4 }]}>
          <View style={styles.proIconWrap}>
            <Flame color={Colors.primary} size={26} fill={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.proTitle}>OnStreak Pro</Text>
            <Text style={styles.proSub}>Free for 7 days</Text>
          </View>
          <View style={styles.proCheck}>
            <Check color={Colors.text} size={14} strokeWidth={3} />
          </View>
        </View>
        <View style={{ gap: 8, marginTop: 12 }}>
          <Feature text="Every challenge & premium plan" />
          <Feature text="Personalized plans" />
          <Feature text="Streak protections · 1 per week" />
          <Feature text="Unlimited crews" />
        </View>
      </View>

      <Text style={styles.unlockingLabel}>UNLOCKING TODAY · 5 PLANS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 24 }}
      >
        <PlanChip Icon={Rocket} title="90-Day Transformation" desc="Transform your body" />
        <PlanChip Icon={Zap} title="30-Day Abs" desc="Core that shows" />
        <PlanChip Icon={Trophy} title="21-Day Strong" desc="3 weeks to power" />
        <PlanChip Icon={Flame} title="14-Day Set" desc="Reignite the spark" />
        <PlanChip Icon={ShieldCheck} title="7-Day Reset" desc="Start fresh" />
      </ScrollView>

      <Text style={[styles.trialOnBoth, { marginTop: 18, marginBottom: 12 }]}>+ 7-DAY FREE TRIAL ON BOTH PLANS</Text>

      <View style={styles.planRow}>
        <Pressable onPress={() => handlePick("annual")} style={styles.planAnnualWrap} testID="paywall-annual" disabled={purchasing}>
          {plan === "annual" ? (
            <LinearGradient
              colors={["#FF7A3D", "#E8561F"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.planAnnualInner}
            >
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>BEST VALUE</Text>
              </View>
              <Text style={styles.planTitle}>Annual</Text>
              <Text style={styles.planPrice}>{annualLabel}{annualPkg ? " / year" : ""}</Text>
              {annualMonthlyEquivalent ? (
                <Text style={styles.planEquivSelected}>{annualMonthlyEquivalent}/month billed annually</Text>
              ) : null}
            </LinearGradient>
          ) : (
            <View style={[styles.planAnnualInner, styles.planUnselected]}>
              <View style={styles.saveBadgeMuted}>
                <Text style={styles.saveBadgeText}>BEST VALUE</Text>
              </View>
              <Text style={styles.planTitle}>Annual</Text>
              <Text style={styles.planPriceMuted}>{annualLabel}{annualPkg ? " / year" : ""}</Text>
              {annualMonthlyEquivalent ? (
                <Text style={styles.planEquivMuted}>{annualMonthlyEquivalent}/month billed annually</Text>
              ) : null}
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => handlePick("monthly")}
          style={[styles.planMonthly, plan === "monthly" && { borderColor: Colors.primary }]}
          testID="paywall-monthly"
          disabled={purchasing}
        >
          <Text style={styles.planTitle}>Monthly</Text>
          <Text style={styles.planPriceMuted}>{monthlyLabel}{monthlyPkg ? " / month" : ""}</Text>
        </Pressable>
      </View>
      <Text style={styles.tinyNote}>7-day free trial · Cancel anytime in Settings</Text>

      {purchasing ? (
        <View style={{ alignItems: "center", paddingVertical: 14 }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : null}

      <View style={{ height: 14 }} />
      <TouchableOpacity onPress={onMaybeLater} style={[styles.maybeLater, { paddingVertical: 16 }]} testID="paywall-skip" disabled={purchasing}>
        <Text style={styles.maybeLaterText}>Maybe later — start with the free plan</Text>
      </TouchableOpacity>
      {isPurchasesSupported ? (
        <TouchableOpacity
          onPress={onRestore}
          style={{ alignItems: "center", paddingVertical: 8 }}
          disabled={restoring || purchasing}
          testID="paywall-restore"
        >
          <Text style={[styles.maybeLaterText, { textDecorationLine: "underline", fontSize: 13 }]}>
            {restoring ? "Restoring\u2026" : "Restore Purchases"}
          </Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.paywallDisclosure}>
        Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Payment will be charged to your Apple ID account at confirmation of purchase. You can manage or cancel your subscription in your App Store account settings.
      </Text>

      <View style={styles.paywallLegalRow}>
        <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL).catch(() => {})} testID="onboarding-paywall-terms">
          <Text style={styles.paywallLegalLink}>Terms of Use</Text>
        </TouchableOpacity>
        <Text style={styles.paywallLegalDot}>·</Text>
        <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} testID="onboarding-paywall-privacy">
          <Text style={styles.paywallLegalLink}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureCheck}>
        <Check color="#22C55E" size={12} strokeWidth={3} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function PlanChip({
  Icon,
  title,
  desc,
}: {
  Icon: React.ComponentType<{ color: string; size: number }>;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.planChip}>
      <View style={styles.planChipIcon}>
        <Icon color={Colors.primary} size={16} />
      </View>
      <Text style={styles.planChipTitle}>{title}</Text>
      <Text style={styles.planChipDesc}>{desc}</Text>
    </View>
  );
}

function DowngradeModal({
  onKeep,
  onContinueFree,
}: {
  onKeep: () => void;
  onContinueFree: () => void;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <View style={styles.modalBackdrop} />
      <View style={styles.modalSheet}>
        <View style={styles.handle} />
        <View style={styles.modalHeaderRow}>
          <View style={styles.modalIconWrap}>
            <AlertCircle color={Colors.primary} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalLabel}>BEFORE YOU GO FREE</Text>
            <Text style={styles.modalTitle}>Here&apos;s what turns off:</Text>
          </View>
        </View>

        <View style={styles.lostList}>
          <LostRow title="4 of 5 plans" right="Stay locked" />
          <View style={styles.prefDivider} />
          <LostRow title="AI personalization" right="Off" />
          <View style={styles.prefDivider} />
          <LostRow title="Streak protection" right="No pause days" />
          <View style={styles.prefDivider} />
          <LostRow title="Friend leaderboards" right="Solo only" />
        </View>

        <View style={styles.reminderCard}>
          <Text style={styles.reminderText}>
            <Text style={{ color: Colors.primary, fontWeight: "800" }}>Reminder:</Text>{" "}
            the trial is free for 7 days. You can cancel before any charge.
          </Text>
        </View>

        <GradientButton label="Keep my 7-day free trial" onPress={onKeep} testID="downgrade-keep" />
        <TouchableOpacity onPress={onContinueFree} style={styles.modalSecondary} testID="downgrade-free">
          <Text style={styles.modalSecondaryText}>Continue with Starter (free)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LostRow({ title, right }: { title: string; right: string }) {
  return (
    <View style={styles.lostRow}>
      <Text style={styles.lostTitle}>{title}</Text>
      <View style={styles.lostRight}>
        <Text style={styles.lostRightText}>{right}</Text>
        <View style={styles.lostMinus}>
          <Minus color={Colors.primary} size={12} strokeWidth={3} />
        </View>
      </View>
    </View>
  );
}

function InviteScreen({
  onInvite,
  onSkip,
  onBack,
}: {
  onInvite: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.screenPad}>
      <BackBtn onPress={onBack} />
      <View style={{ height: 16 }} />
      <StepLabel>ONE MORE THING</StepLabel>
      <Text style={styles.title}>Don&apos;t go it alone.</Text>
      <Text style={styles.sub}>
        People with a friend on the same plan are{" "}
        <Text style={{ color: Colors.text, fontWeight: "800" }}>3.2× more likely</Text> to still be on it 30 days from now.
      </Text>

      <View style={styles.compareCard}>
        <Text style={styles.compareLabel}>30-DAY STICK RATE</Text>
        <View style={styles.compareRow}>
          <Text style={styles.compareName}>Solo</Text>
          <Text style={styles.compareValue}>11%</Text>
        </View>
        <View style={styles.compareTrack}>
          <View style={[styles.compareFillSolo, { width: "11%" }]} />
        </View>
        <View style={[styles.compareRow, { marginTop: 14 }]}>
          <Text style={styles.compareName}>With a{"\n"}friend</Text>
          <Text style={[styles.compareValue, { color: Colors.primary }]}>35%</Text>
        </View>
        <View style={styles.compareTrack}>
          <LinearGradient
            colors={["#FF7A3D", "#E8561F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.compareFillFriend, { width: "35%" }]}
          />
        </View>
      </View>

      <Text style={styles.unlockingLabel}>HOW GROUPS WORK</Text>
      <View style={styles.howCard}>
        <HowRow Icon={Users} title="Invite your crew" desc="Share your private code" />
        <View style={styles.prefDivider} />
        <HowRow Icon={Zap} title="Build group streaks" desc="Every member shows up, or it breaks" />
        <View style={styles.prefDivider} />
        <HowRow Icon={BarChart3} title="Climb the leaderboard" desc="Weekly head-to-heads with other groups" />
        <View style={styles.prefDivider} />
        <HowRow Icon={Bell} title="Nudge a friend" desc="A tap reminds them to log today" />
        <View style={styles.prefDivider} />
        <HowRow Icon={Camera} title="Share completion photos" desc="Receipts your group can react to" />
      </View>

      <View style={{ height: 16 }} />
      <GradientButton label="Invite" onPress={onInvite} testID="invite-cta" />
      <TouchableOpacity onPress={onSkip} style={styles.modalSecondary} testID="invite-skip">
        <Text style={styles.modalSecondaryText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function HowRow({
  Icon,
  title,
  desc,
}: {
  Icon: React.ComponentType<{ color: string; size: number }>;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.howRow}>
      <View style={styles.howIcon}>
        <Icon color={Colors.primary} size={16} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.howTitle}>{title}</Text>
        <Text style={styles.howDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function SignUpScreen({
  email,
  password,
  setEmail,
  setPassword,
  loading,
  error,
  onApple,
  onSubmit,
  onLogin,
  onSkip,
  onBack,
}: {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  loading: boolean;
  error: string | null;
  onApple: () => void;
  onSubmit: () => void;
  onLogin: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.loginScreenPad}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.loginBackRow}>
          <BackBtn onPress={onBack} />
        </View>
        <View style={styles.loginCenter}>
          <Text style={[styles.title, styles.loginTitle]}>Create your account</Text>
          <Text style={[styles.sub, styles.loginSub]}>Save your streak across devices.</Text>

          {Platform.OS === "ios" ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={14}
              style={{ width: "100%", height: 52, marginBottom: 12 }}
              onPress={onApple}
            />
          ) : (
            <TouchableOpacity
              onPress={onApple}
              activeOpacity={0.85}
              style={styles.appleFallbackBtn}
              testID="signup-apple"
            >
              <Text style={styles.appleFallbackText}>Sign up with Apple</Text>
            </TouchableOpacity>
          )}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputRow}>
            <Mail color={Colors.textMuted} size={18} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textDim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              testID="signup-email"
            />
          </View>
          <View style={styles.inputRow}>
            <Lock color={Colors.textMuted} size={18} />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={Colors.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              testID="signup-password"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <GradientButton
            label={loading ? "Creating account…" : "Create account"}
            onPress={onSubmit}
            disabled={loading}
            testID="signup-submit"
          />
          {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} /> : null}

          <Text style={styles.signupTerms}>
            By continuing you agree to our{" "}
            <Text
              style={styles.signupTermsLink}
              onPress={() => Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")}
              testID="signup-terms-link"
            >
              Terms
            </Text>{" "}
            and{" "}
            <Text
              style={styles.signupTermsLink}
              onPress={() => Linking.openURL("https://www.notion.so/OnStreak-Privacy-Policy-34880d23e23c8088ab80db2d85fa82d5?source=copy_link")}
              testID="signup-privacy-link"
            >
              Privacy Policy
            </Text>
            .
          </Text>

          <TouchableOpacity onPress={onLogin} style={styles.welcomeLogin} testID="signup-go-login">
            <Text style={styles.welcomeLoginText}>
              Already a member? <Text style={{ color: Colors.primary, fontWeight: "800" }}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LoginScreen({
  email,
  password,
  setEmail,
  setPassword,
  loading,
  error,
  onApple,
  onSubmit,
  onBack,
}: {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  loading: boolean;
  error: string | null;
  onApple: () => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.loginScreenPad}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.loginBackRow}>
          <BackBtn onPress={onBack} />
        </View>
        <View style={styles.loginCenter}>
          <Text style={[styles.title, styles.loginTitle]}>Welcome back</Text>
          <Text style={[styles.sub, styles.loginSub]}>Log in to pick up your streak.</Text>

          {Platform.OS === "ios" ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={14}
              style={{ width: "100%", height: 52, marginBottom: 12 }}
              onPress={onApple}
            />
          ) : (
            <TouchableOpacity
              onPress={onApple}
              activeOpacity={0.85}
              style={styles.appleFallbackBtn}
              testID="login-apple"
            >
              <Text style={styles.appleFallbackText}>Sign in with Apple</Text>
            </TouchableOpacity>
          )}

          <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputRow}>
            <Mail color={Colors.textMuted} size={18} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textDim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="login-email"
            />
          </View>
          <View style={styles.inputRow}>
            <Lock color={Colors.textMuted} size={18} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="login-password"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <GradientButton
            label={loading ? "Signing in…" : "Log in"}
            onPress={onSubmit}
            disabled={loading}
            testID="login-submit"
          />
          {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1 },
  flex: { flex: 1 },
  glow: {
    position: "absolute",
    top: -120,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(255,107,53,0.18)",
    opacity: 0.7,
  },
  glowOrb: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: 260,
    overflow: "hidden",
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 24,
    paddingTop: 8,
    marginBottom: 4,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#26262B",
  },
  progressBarFilled: { backgroundColor: Colors.primary },
  screenPad: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 12,
    marginBottom: 20,
    gap: 2,
  },
  backText: { color: Colors.textMuted, fontSize: 15, fontWeight: "600" },
  stepLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 12,
  },
  title: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 36,
    marginBottom: 8,
  },
  bigTitle: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  sub: { color: Colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 24 },
  loginScreenPad: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  loginBackRow: { alignSelf: "flex-start" },
  loginCenter: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  loginTitle: {
    fontSize: 32,
    textAlign: "center",
    marginBottom: 10,
  },
  loginSub: {
    textAlign: "center",
    marginBottom: 28,
  },
  appleFallbackBtn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  appleFallbackText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  body: { color: Colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 18 },

  cta: {
    borderRadius: 999,
    overflow: "visible",
    shadowColor: "#FF6B35",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ctaGlow: {
    position: "absolute",
    left: 30,
    right: 30,
    bottom: -8,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(255,107,53,0.35)",
    opacity: 0.7,
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
    borderRadius: 999,
  },
  ctaText: { color: Colors.text, fontSize: 17, fontWeight: "800" },

  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  brandIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandIconImg: {
    width: 36,
    height: 36,
    borderRadius: 9,
  },
  brandText: { color: Colors.text, fontSize: 22, fontFamily: "Satisfy_400Regular", fontStyle: "italic" },
  preLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "700",
    marginBottom: 18,
  },
  megaLine: {
    color: Colors.text,
    fontSize: 84,
    lineHeight: 86,
    fontWeight: "900",
    letterSpacing: -3,
  },
  megaItalic: { fontStyle: "italic" },
  welcomeSubRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 24 },
  welcomeBar: { width: 28, height: 2, backgroundColor: Colors.textMuted, marginTop: 10 },
  welcomeSub: { flex: 1, color: Colors.textMuted, fontSize: 14, lineHeight: 22 },
  welcomeLogin: { alignItems: "center", paddingVertical: 14 },
  welcomeLoginText: { color: Colors.textMuted, fontSize: 14 },

  statCard: {
    marginTop: 28,
    backgroundColor: "#16100D",
    borderColor: "#2A1F1A",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  statHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statHeaderLabel: { color: Colors.textMuted, fontSize: 12, letterSpacing: 1.4, fontWeight: "700" },
  statBigNumber: { color: Colors.primary, fontSize: 28, fontWeight: "900" },
  statBigSuffix: { color: Colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  barsRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, height: 90, marginTop: 18 },
  bar: { flex: 1, borderRadius: 4 },
  barsAxis: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  axisText: { color: Colors.textDim, fontSize: 11, letterSpacing: 1.2, fontWeight: "700" },
  brokenBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  brokenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  brokenText: { color: Colors.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },

  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginTop: 24,
  },
  taskIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  taskTitle: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  taskSub: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  taskCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  nameInput: {
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 72,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(255,107,53,0.10)",
  },
  optionTitle: { color: Colors.text, fontSize: 16, fontWeight: "800" },
  optionDesc: { color: Colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  optionLeftIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  levelBars: { flexDirection: "row", gap: 4, alignItems: "flex-end" },
  levelBar: { width: 6, height: 18, borderRadius: 2 },

  greenInsight: {
    marginTop: 18,
    backgroundColor: "rgba(34,197,94,0.10)",
    borderColor: "rgba(34,197,94,0.25)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  greenInsightText: { color: Colors.textMuted, fontSize: 13, lineHeight: 19 },

  megaStat: {
    color: Colors.primary,
    fontSize: 96,
    fontWeight: "900",
    letterSpacing: -4,
    marginVertical: 4,
  },

  gridCard: {
    marginTop: 24,
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  gridHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  gridLabel: { color: Colors.textMuted, fontSize: 11, letterSpacing: 1.4, fontWeight: "700" },
  gridStick: { color: Colors.primary, fontSize: 20, fontWeight: "900" },
  gridStickSuffix: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  dotGrid: { gap: 6, marginTop: 14 },
  dotRow: { flexDirection: "row", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  gridLegend: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 14 },
  legendDim: { color: Colors.textDim, fontSize: 10, letterSpacing: 1.2, fontWeight: "700" },
  legendMid: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  legendDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 4 },
  legendMidText: { color: Colors.primary, fontSize: 10, letterSpacing: 1.2, fontWeight: "800" },
  legendBright: { color: Colors.text, fontSize: 10, letterSpacing: 1.2, fontWeight: "800" },

  mathCard: {
    marginTop: 16,
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
  },
  mathLabel: { color: Colors.textMuted, fontSize: 11, letterSpacing: 1.4, fontWeight: "800" },
  mathBig: { color: Colors.text, fontSize: 44, fontWeight: "900", letterSpacing: -1.5, marginTop: 6 },
  mathSub: { color: Colors.textMuted, fontSize: 14, marginTop: 6 },

  greenCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(34,197,94,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  refRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  refIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  refLabel: { color: Colors.textMuted, fontSize: 11, letterSpacing: 1.4, fontWeight: "800" },
  refValue: { color: Colors.text, fontSize: 16, fontWeight: "800", marginTop: 4 },
  foundationCard: {
    marginTop: 18,
    backgroundColor: "rgba(255,107,53,0.06)",
    borderColor: "rgba(255,107,53,0.25)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  foundationText: { color: Colors.textMuted, fontSize: 13, lineHeight: 19 },

  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginVertical: 18,
    gap: 8,
  },
  timeColon: { color: Colors.text, fontSize: 28, fontWeight: "900" },
  wheel: {
    alignItems: "center",
    flex: 1,
    height: WHEEL_HEIGHT,
    justifyContent: "center",
    position: "relative",
  },
  wheelScroll: {
    height: WHEEL_HEIGHT,
    width: "100%",
  },
  wheelHighlight: {
    position: "absolute",
    left: 4,
    right: 4,
    top: WHEEL_ITEM_HEIGHT,
    height: WHEEL_ITEM_HEIGHT,
    backgroundColor: "rgba(255,107,53,0.15)",
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 12,
    zIndex: 1,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelItemText: {
    color: Colors.textDim,
    fontSize: 22,
    fontWeight: "700",
  },
  wheelItemTextActive: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -1,
  },
  ampm: { alignItems: "center", flex: 1, gap: 6 },
  ampmGhost: { color: Colors.textDim, fontSize: 22, fontWeight: "700" },
  ampmActive: { color: Colors.text, fontSize: 28, fontWeight: "900" },

  prefsCard: {
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 18,
    padding: 4,
    marginBottom: 22,
  },
  prefRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  prefDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#26262B", marginHorizontal: 14 },
  prefCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#3A3A40",
    alignItems: "center",
    justifyContent: "center",
  },
  prefCheckOn: { backgroundColor: "rgba(255,107,53,0.18)", borderColor: Colors.primary },
  prefTitle: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  prefDesc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  skip: { alignItems: "center", paddingVertical: 18 },
  skipText: { color: Colors.textMuted, fontSize: 14, fontWeight: "700" },

  proCard: {
    marginTop: 12,
    borderColor: Colors.primary,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 18,
    backgroundColor: "rgba(255,107,53,0.06)",
  },
  trialBadge: {
    position: "absolute",
    top: -12,
    left: 18,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  trialBadgeText: { color: Colors.text, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  proHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 },
  proIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(255,107,53,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  proTitle: { color: Colors.text, fontSize: 22, fontWeight: "900" },
  proSub: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  proCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(34,197,94,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { color: Colors.text, fontSize: 14, fontWeight: "600" },

  unlockingLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "800",
    marginTop: 22,
    marginBottom: 10,
  },
  planChip: {
    width: 150,
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  planChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  planChipTitle: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  planChipDesc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  trialOnBoth: {
    color: Colors.primary,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  planRow: { flexDirection: "row", gap: 10 },
  planAnnualWrap: { flex: 1, borderRadius: 14 },
  planAnnualInner: {
    paddingTop: 26,
    paddingBottom: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    borderRadius: 14,
    minHeight: 96,
    justifyContent: "center",
  },
  planUnselected: {
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
  },
  saveBadge: {
    position: "absolute",
    top: 6,
    backgroundColor: Colors.text,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  saveBadgeMuted: {
    position: "absolute",
    top: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  saveBadgeText: { color: "#0A0A0B", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  planTitle: { color: Colors.text, fontSize: 18, fontWeight: "900", marginTop: 4 },
  planPrice: { color: Colors.text, fontSize: 12, marginTop: 4, fontWeight: "700" },
  planPriceMuted: { color: Colors.textMuted, fontSize: 12, marginTop: 4, fontWeight: "700" },
  planMonthly: {
    flex: 1,
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 96,
  },
  tinyNote: { color: Colors.textDim, fontSize: 12, textAlign: "center", marginTop: 10 },
  maybeLater: {
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  maybeLaterText: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  planEquivSelected: { color: "#FFE9DC", fontSize: 11, fontWeight: "700", marginTop: 4 },
  planEquivMuted: { color: Colors.textDim, fontSize: 11, fontWeight: "700", marginTop: 4 },
  paywallDisclosure: {
    color: Colors.textDim,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 14,
    paddingHorizontal: 4,
  },
  paywallLegalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  paywallLegalLink: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  paywallLegalDot: { color: Colors.textDim, fontSize: 12 },

  applePayBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  applePaySheet: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: "#1C1C1E",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    borderColor: "#2C2C2E",
    borderWidth: 1,
  },
  applePayHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#3A3A3C",
    alignSelf: "center",
    marginBottom: 14,
  },
  applePayTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  applePayBrand: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  applePayCancel: { color: "#0A84FF", fontSize: 16, fontWeight: "500" },
  applePayMerchantRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  applePayMerchantLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,53,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  applePayMerchantName: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  applePayMerchantSub: { color: "#8E8E93", fontSize: 13, marginTop: 2 },
  applePayDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#2C2C2E", marginVertical: 10 },
  applePayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  applePayRowLabel: { color: "#8E8E93", fontSize: 14, fontWeight: "500" },
  applePayCardChip: {
    backgroundColor: "#2C2C2E",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  applePayCardText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  applePayItem: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  applePayItemSub: { color: "#8E8E93", fontSize: 12, marginTop: 2 },
  applePayTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  applePayTotalLabel: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  applePayTotalValue: { color: "#FFFFFF", fontSize: 19, fontWeight: "800" },
  applePayThenRow: { marginTop: 4, marginBottom: 16 },
  applePayThen: { color: "#8E8E93", fontSize: 12, textAlign: "right" },
  applePayConfirmBtn: {
    backgroundColor: "#000000",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  applePayConfirmText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  applePayFootnote: { color: "#8E8E93", fontSize: 11, textAlign: "center", marginTop: 10 },

  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  modalSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#101013",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 40,
    borderColor: "#26262B",
    borderWidth: 1,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3A3A40",
    alignSelf: "center",
    marginBottom: 18,
  },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalLabel: { color: Colors.primary, fontSize: 11, letterSpacing: 1.6, fontWeight: "800" },
  modalTitle: { color: Colors.text, fontSize: 22, fontWeight: "900", marginTop: 4 },
  lostList: {
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 14,
  },
  lostRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  lostTitle: { color: Colors.text, fontSize: 15, fontWeight: "800", flex: 1 },
  lostRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  lostRightText: { color: Colors.textMuted, fontSize: 13, fontWeight: "700", textAlign: "right" },
  lostMinus: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderCard: {
    backgroundColor: "rgba(255,107,53,0.08)",
    borderColor: "rgba(255,107,53,0.25)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  reminderText: { color: Colors.textMuted, fontSize: 13, lineHeight: 19 },
  modalSecondary: {
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  modalSecondaryText: { color: Colors.text, fontSize: 14, fontWeight: "700" },

  compareCard: {
    marginTop: 14,
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  compareLabel: { color: Colors.textMuted, fontSize: 11, letterSpacing: 1.4, fontWeight: "800", marginBottom: 12 },
  compareRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  compareName: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  compareValue: { color: Colors.textMuted, fontSize: 15, fontWeight: "800" },
  compareTrack: { height: 8, backgroundColor: "#26262B", borderRadius: 4, overflow: "hidden" },
  compareFillSolo: { height: 8, backgroundColor: "#3A3A40", borderRadius: 4 },
  compareFillFriend: { height: 8, borderRadius: 4 },

  howCard: {
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 14,
  },
  howRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  howIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,107,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  howTitle: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  howDesc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#141416",
    borderColor: "#26262B",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  input: { flex: 1, color: Colors.text, fontSize: 16, fontWeight: "600", paddingVertical: 16 },
  errorText: { color: Colors.danger, fontSize: 13, fontWeight: "600", marginBottom: 12 },
  signupTerms: {
    color: Colors.textDim,
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 18,
  },
  signupSkip: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  signupSkipText: { color: Colors.textMuted, fontSize: 14, fontWeight: "600" },
  signupTermsLink: { color: Colors.primary, fontWeight: "700", textDecorationLine: "underline" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textDim, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
});
