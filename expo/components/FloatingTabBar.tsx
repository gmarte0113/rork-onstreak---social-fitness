import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Share2, CalendarCheck, Users, Lock } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

type IconName = "index" | "progress" | "social" | "premium";

const ICONS: Record<IconName, React.ComponentType<{ color: string; size: number; strokeWidth?: number }>> = {
  index: Share2,
  progress: CalendarCheck,
  social: Users,
  premium: Lock,
};

const LABELS: Record<IconName, string> = {
  index: "Home",
  progress: "Activity",
  social: "Groups",
  premium: "Programs",
};

const H_PADDING = 8;
const ICON_SIZE = 22;
const BAR_HEIGHT = 60;

type TabItemProps = {
  isActive: boolean;
  Icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>;
  label: string;
  labelOpacity: Animated.Value;
  onTabLayout: (e: LayoutChangeEvent) => void;
  onContentLayout: (e: LayoutChangeEvent) => void;
  onPress: () => void;
  testID?: string;
};

function TabItem({ isActive, Icon, label, labelOpacity, onTabLayout, onContentLayout, onPress, testID }: TabItemProps) {
  const iconScale = useRef(new Animated.Value(isActive ? 1.1 : 1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(iconScale, {
      toValue: isActive ? 1.12 : 1,
      useNativeDriver: true,
      damping: 14,
      stiffness: 220,
      mass: 0.7,
    }).start();
  }, [isActive, iconScale]);

  return (
    <Pressable
      onPress={onPress}
      onLayout={onTabLayout}
      onPressIn={() => {
        Animated.spring(pressScale, {
          toValue: 0.94,
          useNativeDriver: true,
          damping: 18,
          stiffness: 320,
          mass: 0.6,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(pressScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 280,
          mass: 0.6,
        }).start();
      }}
      style={[styles.tab, isActive && styles.tabActive]}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <Animated.View
        onLayout={onContentLayout}
        style={{ transform: [{ scale: Animated.multiply(iconScale, pressScale) }], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <Icon
          color={isActive ? "#FFFFFF" : Colors.textMuted}
          size={ICON_SIZE}
          strokeWidth={isActive ? 2.4 : 2}
        />
        {isActive ? (
          <Animated.Text numberOfLines={1} style={[styles.label, { opacity: labelOpacity }]}>
            {label}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [tabLayouts, setTabLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const [contentWidths, setContentWidths] = useState<Record<number, number>>({});

  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(1)).current;

  const activeIndex = state.index;
  const activeTab = tabLayouts[activeIndex];
  const activeContentWidth = contentWidths[activeIndex];
  const PILL_PADDING = 20;
  const pillTargetWidth =
    activeContentWidth !== undefined ? activeContentWidth + PILL_PADDING * 2 : undefined;
  const activeLayout =
    activeTab && pillTargetWidth !== undefined
      ? {
          x: H_PADDING + activeTab.x + activeTab.width / 2 - pillTargetWidth / 2,
          width: pillTargetWidth,
        }
      : undefined;

  useEffect(() => {
    if (!activeLayout) return;
    labelOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(pillX, {
        toValue: activeLayout.x,
        useNativeDriver: false,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
      }),
      Animated.spring(pillW, {
        toValue: activeLayout.width,
        useNativeDriver: false,
        damping: 18,
        stiffness: 180,
        mass: 0.9,
      }),
      Animated.timing(labelOpacity, {
        toValue: 1,
        duration: 220,
        delay: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeIndex, activeLayout, labelOpacity, pillX, pillW]);

  const onTabLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setTabLayouts((prev) => {
      const existing = prev[index];
      if (existing && existing.x === x && existing.width === width) return prev;
      return { ...prev, [index]: { x, width } };
    });
  };

  const onContentLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setContentWidths((prev) => {
      if (prev[index] === width) return prev;
      return { ...prev, [index]: width };
    });
  };

  const bottomOffset = Math.max(insets.bottom, 16);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: bottomOffset }]}>
      <View style={styles.shadowWrap}>
        <View style={styles.container} testID="floating-tab-bar">
          {Platform.OS === "ios" ? (
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.androidBg]} />
          )}
          <View style={[StyleSheet.absoluteFill, styles.tintOverlay]} />

          {activeLayout ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pill,
                {
                  left: pillX,
                  width: pillW,
                },
              ]}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          ) : null}

          <View style={styles.tabsRow}>
            {state.routes.map((route, index) => {
              const isActive = index === activeIndex;
              const name = route.name as IconName;
              const Icon = ICONS[name] ?? Share2;
              const label = LABELS[name] ?? route.name;
              return (
                <TabItem
                  key={route.key}
                  isActive={isActive}
                  Icon={Icon}
                  label={label}
                  labelOpacity={labelOpacity}
                  onTabLayout={onTabLayout(index)}
                  onContentLayout={onContentLayout(index)}
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.selectionAsync().catch(() => {});
                    }
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!isActive && !event.defaultPrevented) {
                      navigation.navigate(route.name, route.params);
                    }
                  }}
                  testID={`tab-${route.name}`}
                />
              );
            })}
          </View>


        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  shadowWrap: {
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
    borderRadius: 999,
  },
  container: {
    height: BAR_HEIGHT,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: H_PADDING,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
  },
  androidBg: {
    backgroundColor: "rgba(18,18,20,0.96)",
  },
  tintOverlay: {
    backgroundColor: "rgba(10,10,11,0.55)",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  tab: {
    height: BAR_HEIGHT - H_PADDING * 2,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
  },
  tabActive: {
    paddingHorizontal: 18,
  },
  pill: {
    position: "absolute",
    top: H_PADDING,
    bottom: H_PADDING,
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
