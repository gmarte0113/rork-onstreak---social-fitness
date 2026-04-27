import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import {
  Camera as CameraIcon,
  Check,
  RefreshCw,
  SwitchCamera,
  X,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { estimateWorkoutReps, useApp } from "@/providers/AppProvider";
import { maybeRequestFirstWorkoutReview } from "@/lib/review";

type Source = "today" | "plan" | "program";

export default function WorkoutPhotoScreen() {
  const params = useLocalSearchParams<{
    source: Source;
    programId?: string;
    day?: string;
  }>();
  const {
    todayWorkout,
    completeTodaysWorkout,
    completePersonalizedPlanDay,
    completeProgramDay,
    personalizedPlanDays,
    addWorkoutPhoto,
  } = useApp();

  const [permission, requestPermission] = useCameraPermissions();
  const [captured, setCaptured] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const cameraRef = useRef<CameraView | null>(null);

  const toggleFacing = async () => {
    if (Platform.OS !== "web") {
      await Haptics.selectionAsync().catch(() => {});
    }
    setFacing((f) => (f === "front" ? "back" : "front"));
  };

  const onShoot = async () => {
    if (!cameraRef.current) return;
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: true,
      });
      if (photo?.uri) setCaptured(photo.uri);
    } catch (e) {
      console.log("[workout-photo] capture error", e);
      Alert.alert("Camera error", "Could not take the photo. Try again.");
    }
  };

  const onRetake = () => setCaptured(null);

  const onPickFromGallery = async () => {
    try {
      if (Platform.OS !== "web") {
        await Haptics.selectionAsync().catch(() => {});
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setCaptured(result.assets[0].uri);
      }
    } catch (e) {
      console.log("[workout-photo] gallery pick error", e);
      Alert.alert("Gallery error", "Could not open the gallery. Try again.");
    }
  };

  const onSubmit = async () => {
    if (!captured) return;
    setSubmitting(true);
    try {
      addWorkoutPhoto(captured);

      if (params.source === "today") {
        completeTodaysWorkout({
          reps: estimateWorkoutReps(todayWorkout.exercises),
          minutes: todayWorkout.durationMinutes,
        });
      } else if (params.source === "plan" && params.day) {
        const dayNum = parseInt(params.day, 10);
        const entry = personalizedPlanDays.find((d) => d.day === dayNum);
        completePersonalizedPlanDay(dayNum, {
          reps: entry ? estimateWorkoutReps(entry.exercises) : 0,
          minutes: entry?.durationMinutes ?? 0,
        });
      } else if (params.source === "program" && params.programId && params.day) {
        completeProgramDay(params.programId, parseInt(params.day, 10));
      }

      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      router.back();
      setTimeout(() => {
        maybeRequestFirstWorkoutReview().catch((e) =>
          console.log("[workout-photo] review error", e)
        );
      }, 600);
    } finally {
      setSubmitting(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Proof Photo" }} />
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Proof Photo" }} />
        <View style={styles.permIcon}>
          <CameraIcon color={Colors.primary} size={28} />
        </View>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permSub}>
          Your group requires a real-time photo to verify today&apos;s workout.
          Gallery uploads aren&apos;t allowed.
        </Text>
        <TouchableOpacity
          style={styles.permBtn}
          onPress={requestPermission}
          activeOpacity={0.85}
          testID="grant-camera"
        >
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
        {captured ? (
          <View style={[styles.webPreviewWrap, { marginTop: 16 }]}>
            <Image source={{ uri: captured }} style={styles.webPreview} contentFit="cover" />
            <View style={styles.webPreviewActions}>
              <TouchableOpacity
                style={[styles.permBtn, styles.permBtnSecondary]}
                onPress={onRetake}
                testID="retake-photo-perm"
              >
                <Text style={styles.permBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.permBtn}
                onPress={onSubmit}
                disabled={submitting}
                testID="submit-photo-perm"
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <Text style={styles.permBtnText}>Confirm & Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelLink}>
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Proof Photo" }} />
        <View style={styles.permIcon}>
          <CameraIcon color={Colors.primary} size={28} />
        </View>
        <Text style={styles.permTitle}>Open on mobile</Text>
        <Text style={styles.permSub}>
          Group verification requires the camera. You can also pick a photo
          from the gallery for testing.
        </Text>
        {captured ? (
          <View style={styles.webPreviewWrap}>
            <Image source={{ uri: captured }} style={styles.webPreview} contentFit="cover" />
            <View style={styles.webPreviewActions}>
              <TouchableOpacity
                style={[styles.permBtn, styles.permBtnSecondary]}
                onPress={onRetake}
                testID="retake-photo-web"
              >
                <Text style={styles.permBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.permBtn}
                onPress={onSubmit}
                disabled={submitting}
                testID="submit-photo-web"
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <Text style={styles.permBtnText}>Confirm & Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.permBtn}
            onPress={onPickFromGallery}
            testID="pick-from-gallery-web"
          >
            <Text style={styles.permBtnText}>Choose photo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelLink}>
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Proof Photo", headerShown: false }} />
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        testID="close-photo"
      >
        <X color={Colors.text} size={22} />
      </TouchableOpacity>

      {captured ? (
        <View style={{ flex: 1 }}>
          <Image source={{ uri: captured }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={styles.overlay}>
            <View style={styles.topBadge}>
              <Text style={styles.topBadgeText}>REVIEW PROOF</Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={styles.reviewActions}>
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={onRetake}
                activeOpacity={0.85}
                testID="retake-photo"
              >
                <RefreshCw color={Colors.text} size={18} />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={onSubmit}
                disabled={submitting}
                activeOpacity={0.85}
                testID="submit-photo"
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <>
                    <Check color={Colors.text} size={20} strokeWidth={3} />
                    <Text style={styles.submitText}>Confirm & Complete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="picture"
        >
          <View style={styles.overlay}>
            <View style={styles.topBadge}>
              <Text style={styles.topBadgeText}>LIVE CAPTURE · GROUP PROOF</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Text style={styles.hint}>
              Snap a real-time photo to verify today&apos;s workout.
            </Text>
            <View style={styles.shootRow}>
              <View style={styles.sideSlot} />
              <TouchableOpacity
                style={styles.shutter}
                onPress={onShoot}
                activeOpacity={0.8}
                testID="shutter"
              >
                <View style={styles.shutterInner} />
              </TouchableOpacity>
              <View style={styles.sideSlot}>
                <TouchableOpacity
                  style={styles.flipBtn}
                  onPress={toggleFacing}
                  activeOpacity={0.85}
                  testID="flip-camera"
                >
                  <SwitchCamera color={Colors.text} size={22} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  closeBtn: {
    position: "absolute",
    top: 54,
    left: 18,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    padding: 24,
    paddingTop: 56,
    paddingBottom: 48,
  },
  topBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  topBadgeText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  hint: {
    color: Colors.text,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    opacity: 0.8,
  },
  shootRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideSlot: {
    width: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  flipBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 4,
    borderColor: Colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Colors.text,
  },
  reviewActions: {
    flexDirection: "row",
    gap: 10,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  retakeText: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  submitBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  submitText: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  permIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,107,53,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  permTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  permSub: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 20,
  },
  permBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  permBtnText: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  cancelLink: { marginTop: 16 },
  cancelLinkText: { color: Colors.textMuted, fontSize: 14, fontWeight: "700" },
  permBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  webPreviewWrap: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 12,
  },
  webPreview: {
    width: "100%",
    height: 260,
    borderRadius: 16,
    backgroundColor: "#111",
  },
  webPreviewActions: {
    flexDirection: "row",
    gap: 10,
  },
});
