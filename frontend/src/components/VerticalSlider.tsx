import React, { useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { colors, fonts } from "@/src/theme/colors";

type Props = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  height?: number;
  testID?: string;
};

export function VerticalSlider({
  label,
  value,
  min = -12,
  max = 12,
  onChange,
  height = 168,
  testID,
}: Props) {
  const range = max - min;
  const accRef = useRef(value);
  const [h, setH] = useState(height);

  useEffect(() => {
    accRef.current = value;
  }, [value]);

  const onLayout = (e: LayoutChangeEvent) => setH(e.nativeEvent.layout.height);

  const adjust = (deltaPx: number) => {
    const deltaVal = (-deltaPx / h) * range;
    const next = Math.max(min, Math.min(max, accRef.current + deltaVal));
    accRef.current = next;
    onChange(Math.round(next));
  };

  const pan = Gesture.Pan().onChange((e) => {
    runOnJS(adjust)(e.changeY);
  });

  const fraction = (value - min) / range; // 0 bottom .. 1 top
  const zeroFraction = (0 - min) / range;
  const thumbBottom = fraction * h;
  const zeroBottom = zeroFraction * h;

  // Fill spans between the 0-line and the thumb.
  const fillBottom = Math.min(thumbBottom, zeroBottom);
  const fillHeight = Math.abs(thumbBottom - zeroBottom);

  const display = value > 0 ? `+${value}` : `${value}`;

  return (
    <View style={styles.col} testID={testID}>
      <Text style={styles.value}>{display}</Text>
      <GestureDetector gesture={pan}>
        <View style={[styles.trackArea, { height }]} onLayout={onLayout}>
          <View style={styles.track} />
          <View style={[styles.zeroLine, { bottom: zeroBottom }]} />
          <View
            style={[
              styles.fill,
              { bottom: fillBottom, height: Math.max(2, fillHeight) },
            ]}
          />
          <View style={[styles.thumb, { bottom: thumbBottom - 9 }]} />
        </View>
      </GestureDetector>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { alignItems: "center", gap: 10 },
  value: {
    color: colors.textSecondary,
    fontFamily: fonts.monoMedium,
    fontSize: 12,
  },
  trackArea: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    position: "absolute",
    width: 6,
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.borderSubtle,
  },
  zeroLine: {
    position: "absolute",
    width: 16,
    height: 1,
    backgroundColor: colors.borderStrong,
  },
  fill: {
    position: "absolute",
    width: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  thumb: {
    position: "absolute",
    width: 22,
    height: 18,
    borderRadius: 6,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  label: {
    color: colors.textTertiary,
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
