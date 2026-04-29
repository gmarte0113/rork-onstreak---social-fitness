import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, X } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { toDateKey } from "@/constants/workouts";
import { useApp } from "@/providers/AppProvider";
import type { WeightUnit } from "@/providers/AppProvider";

const LB_PER_KG = 2.20462;

export default function LogWeightScreen() {
  const { state, logWeight, setWeightUnit } = useApp();
  const [value, setValue] = useState<string>("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const unit: WeightUnit = state.weightUnit;

  const pickPhoto = async () => {
    try {
      const todayKeyLocal = toDateKey(new Date());
      const hasPhotoToday =
        state.beforePhoto?.date === todayKeyLocal ||
        state.afterPhoto?.date === todayKeyLocal ||
        (state.extraPhotos ?? []).some((p) => p.date === todayKeyLocal);
      if (hasPhotoToday) {
        Alert.alert(
          "Daily limit reached",
          "You can only add one progress photo per day. Come back tomorrow!"
        );
        return;
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow photo library access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.log("[log-weight] pick photo error", e);
    }
  };

  const save = () => {
    const n = parseFloat(value.replace(",", "."));
    const maxForUnit = unit === "kg" ? 500 : 1100;
    if (!Number.isFinite(n) || n <= 0 || n > maxForUnit) {
      Alert.alert(
        "Invalid weight",
        `Enter a value between 1 and ${maxForUnit} ${unit}.`
      );
      return;
    }
    const kg = unit === "kg" ? n : n / LB_PER_KG;
    const doSave = (uri?: string) => {
      logWeight(kg, uri);
      router.back();
    };
    if (photoUri) {
      doSave(photoUri);
      return;
    }
    if (Platform.OS === "web") {
      doSave();
      return;
    }
    Alert.alert(
      "Add a progress photo?",
      "Pair this entry with a photo to see your body change over time.",
      [
        { text: "Skip", style: "cancel", onPress: () => doSave() },
        { text: "Add photo", onPress: pickPhoto },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.body}>
        <Text style={styles.label}>CURRENT WEIGHT</Text>

        <View style={styles.unitToggle}>
          {(["kg", "lb"] as const).map((u) => {
            const active = unit === u;
            return (
              <TouchableOpacity
                key={u}
                onPress={() => setWeightUnit(u)}
                style={[styles.unitBtn, active && styles.unitBtnActive]}
                testID={`unit-${u}`}
              >
                <Text
                  style={[
                    styles.unitBtnText,
                    active && styles.unitBtnTextActive,
                  ]}
                >
                  {u.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="0.0"
            placeholderTextColor={Colors.textDim}
            keyboardType="decimal-pad"
            style={styles.input}
            autoFocus
            testID="weight-input"
          />
          <Text style={styles.unit}>{unit}</Text>
        </View>
        <Text style={styles.hint}>
          Log weekly to see your long-term trend.
        </Text>

        {photoUri ? (
          <View style={styles.photoPreview}>
            <Image source={{ uri: photoUri }} style={styles.photoImg} />
            <TouchableOpacity
              style={styles.photoClose}
              onPress={() => setPhotoUri(null)}
              testID="clear-photo"
            >
              <X color={Colors.text} size={16} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={pickPhoto}
            activeOpacity={0.85}
            testID="add-photo-btn"
          >
            <Camera color={Colors.primary} size={18} />
            <Text style={styles.photoBtnText}>Add progress photo (optional)</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cta}
          onPress={save}
          activeOpacity={0.85}
          testID="save-weight-btn"
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Save</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  body: { flex: 1, padding: 28, justifyContent: "center" },
  label: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  unitToggle: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    alignSelf: "flex-start",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unitBtnActive: {
    backgroundColor: "rgba(255,107,53,0.15)",
  },
  unitBtnText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  unitBtnTextActive: { color: Colors.primary },
  inputRow: {
    flexDirection: "row",
    alignItems: "baseline",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 10,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -1,
    padding: 0,
  },
  unit: { color: Colors.textMuted, fontSize: 22, fontWeight: "700" },
  hint: { color: Colors.textMuted, fontSize: 13, marginBottom: 32 },
  cta: { borderRadius: 16, overflow: "hidden" },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,107,53,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.3)",
    borderStyle: "dashed",
    marginBottom: 16,
  },
  photoBtnText: { color: Colors.primary, fontSize: 14, fontWeight: "700" },
  photoPreview: {
    aspectRatio: 3 / 4,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: Colors.surface,
  },
  photoImg: { width: "100%", height: "100%" },
  photoClose: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
