import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const TOP_GLOW_SIZE = Math.max(SCREEN_W * 1.6, 700);
const BOTTOM_GLOW_SIZE = Math.max(SCREEN_W * 1.4, 600);

function AppBackgroundBase() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="app-background">
      <View style={styles.base} />

      <LinearGradient
        colors={["#0F0E10", "#0A0A0B", "#070708"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.glow,
          {
            width: TOP_GLOW_SIZE,
            height: TOP_GLOW_SIZE,
            borderRadius: TOP_GLOW_SIZE / 2,
            top: -TOP_GLOW_SIZE * 0.62,
            left: (SCREEN_W - TOP_GLOW_SIZE) / 2,
          },
        ]}
      >
        <LinearGradient
          colors={[
            "rgba(255,107,53,0.18)",
            "rgba(255,107,53,0.08)",
            "rgba(255,107,53,0.0)",
          ]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: TOP_GLOW_SIZE / 2 }]}
        />
      </View>

      <View
        style={[
          styles.glow,
          {
            width: BOTTOM_GLOW_SIZE,
            height: BOTTOM_GLOW_SIZE,
            borderRadius: BOTTOM_GLOW_SIZE / 2,
            bottom: -BOTTOM_GLOW_SIZE * 0.7,
            left: (SCREEN_W - BOTTOM_GLOW_SIZE) / 2 + SCREEN_W * 0.18,
          },
        ]}
      >
        <LinearGradient
          colors={[
            "rgba(255,107,53,0.10)",
            "rgba(255,107,53,0.04)",
            "rgba(255,107,53,0.0)",
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: BOTTOM_GLOW_SIZE / 2 }]}
        />
      </View>

      <LinearGradient
        colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.0)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.grain} pointerEvents="none">
        {Array.from({ length: 36 }).map((_, i) => {
          const top = (i * 53) % SCREEN_H;
          const left = (i * 97) % SCREEN_W;
          const size = (i % 3) + 1;
          const opacity = 0.025 + ((i % 4) * 0.008);
          return (
            <View
              key={`g-${i}`}
              style={{
                position: "absolute",
                top,
                left,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: "#FFFFFF",
                opacity,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bg,
  },
  glow: {
    position: "absolute",
    overflow: "hidden",
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
});

const AppBackground = React.memo(AppBackgroundBase);
export default AppBackground;
