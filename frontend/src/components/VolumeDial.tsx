import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { colors, fonts } from "@/src/theme/colors";

type Props = {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  muted?: boolean;
};

export function VolumeDial({ value, onChange, size = 250, muted = false }: Props) {
  const stroke = 14;
  const r = (size - stroke - 24) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const accRef = useRef(value);

  useEffect(() => {
    accRef.current = value;
  }, [value]);

  const adjust = (d: number) => {
    const next = Math.max(0, Math.min(100, accRef.current + d));
    accRef.current = next;
    const rounded = Math.round(next);
    if (rounded !== value) onChange(rounded);
  };

  const pan = Gesture.Pan().onChange((e) => {
    runOnJS(adjust)(-e.changeY * 0.45);
  });

  const dashOffset = C * (1 - value / 100);
  const arcColor = muted ? colors.textTertiary : colors.white;

  return (
    <GestureDetector gesture={pan}>
      <View
        testID="volume-dial"
        style={[styles.wrap, { width: size, height: size }]}
      >
        <View
          style={[
            styles.innerDisc,
            {
              width: size - stroke - 40,
              height: size - stroke - 40,
              borderRadius: (size - stroke - 40) / 2,
            },
          ]}
        />
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle
            cx={cx}
            cy={cy}
            r={r + 16}
            stroke={colors.borderSubtle}
            strokeWidth={1}
            fill="none"
            strokeDasharray="1 7"
          />
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={colors.borderSubtle}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={arcColor}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={C}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.value} testID="volume-value">
            {muted ? "—" : value}
          </Text>
          <Text style={styles.unit}>{muted ? "MUET" : "VOLUME"}</Text>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  innerDisc: {
    position: "absolute",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  center: { alignItems: "center", justifyContent: "center" },
  value: {
    color: colors.textPrimary,
    fontFamily: fonts.light,
    fontSize: 72,
    letterSpacing: -2,
    lineHeight: 78,
  },
  unit: {
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 4,
    marginTop: 2,
  },
});
