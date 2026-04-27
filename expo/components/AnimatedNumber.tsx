import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleProp, Text, TextStyle } from "react-native";

type Props = {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

export default function AnimatedNumber({
  value,
  duration = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  style,
  testID,
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState<string>(`${prefix}${(0).toFixed(decimals)}${suffix}`);

  useEffect(() => {
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => {
      const n = v * value;
      setDisplay(`${prefix}${n.toFixed(decimals)}${suffix}`);
    });
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      anim.removeListener(id);
    };
  }, [value, duration, decimals, prefix, suffix, anim]);

  return (
    <Text style={style} testID={testID}>
      {display}
    </Text>
  );
}
