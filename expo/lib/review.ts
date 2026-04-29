import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as StoreReview from "expo-store-review";

const SEEN_KEY = "@onstreak/has_seen_review_prompt";
const FIRST_WORKOUT_KEY = "@onstreak/has_completed_first_workout";

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeReviewPrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitShow(): void {
  for (const l of listeners) {
    try {
      l();
    } catch (e) {
      console.log("[review] listener error", e);
    }
  }
}

export async function hasSeenReviewPrompt(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(SEEN_KEY);
    return v === "1";
  } catch (e) {
    console.log("[review] hasSeenReviewPrompt error", e);
    return false;
  }
}

export async function markReviewPromptSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, "1");
  } catch (e) {
    console.log("[review] markReviewPromptSeen error", e);
  }
}

export async function hasCompletedFirstWorkout(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(FIRST_WORKOUT_KEY);
    return v === "1";
  } catch (e) {
    console.log("[review] hasCompletedFirstWorkout error", e);
    return false;
  }
}

export async function markFirstWorkoutCompletedIfNeeded(): Promise<boolean> {
  try {
    const existing = await AsyncStorage.getItem(FIRST_WORKOUT_KEY);
    if (existing === "1") return false;
    await AsyncStorage.setItem(FIRST_WORKOUT_KEY, "1");
    return true;
  } catch (e) {
    console.log("[review] markFirstWorkoutCompletedIfNeeded error", e);
    return false;
  }
}

let scheduledTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;

export function scheduleFirstWorkoutReviewPrompt(delayMs: number = 3000): void {
  if (Platform.OS === "web") return;
  if (inFlight) return;
  if (scheduledTimer) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }
  inFlight = true;
  scheduledTimer = setTimeout(async () => {
    scheduledTimer = null;
    try {
      const seen = await hasSeenReviewPrompt();
      if (seen) {
        console.log("[review] already seen pre-prompt, skipping");
        return;
      }
      const available = await StoreReview.isAvailableAsync();
      if (!available) {
        console.log("[review] StoreReview not available, skipping pre-prompt");
        return;
      }
      emitShow();
    } catch (e) {
      console.log("[review] schedule error", e);
    } finally {
      inFlight = false;
    }
  }, delayMs);
}

export async function requestNativeReview(): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    const available = await StoreReview.isAvailableAsync();
    if (!available) {
      console.log("[review] StoreReview not available");
      return;
    }
    const hasAction = await StoreReview.hasAction();
    if (!hasAction) {
      console.log("[review] StoreReview hasAction false");
      return;
    }
    console.log("[review] requesting native review prompt");
    await StoreReview.requestReview();
  } catch (e) {
    console.log("[review] requestNativeReview error", e);
  }
}

export async function maybeRequestFirstWorkoutReview(): Promise<void> {
  scheduleFirstWorkoutReviewPrompt(0);
}
