import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as StoreReview from "expo-store-review";

const KEY = "@onstreak/reviewed_first_workout";

export async function maybeRequestFirstWorkoutReview(): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    const done = await AsyncStorage.getItem(KEY);
    if (done) {
      console.log("[review] already requested, skipping");
      return;
    }
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
    await AsyncStorage.setItem(KEY, "1");
  } catch (e) {
    console.log("[review] error", e);
  }
}
