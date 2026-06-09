import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Link2, Minus, Plus } from "lucide-react-native";

import { colors, fonts, radius, spacing } from "@/src/theme/colors";

type Props = {
  label: string;
  sub?: string;
  onDown: () => void;
  onUp: () => void;
  boundDown?: boolean;
  boundUp?: boolean;
  testIDBase: string;
};

export function StepperRow({
  label,
  sub,
  onDown,
  onUp,
  boundDown = false,
  boundUp = false,
  testIDBase,
}: Props) {
  const tap = (fn: () => void) => () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  return (
    <View style={styles.row}>
      <Pressable
        testID={`${testIDBase}-down-btn`}
        onPress={tap(onDown)}
        style={({ pressed }) => [
          styles.btn,
          !boundDown && styles.unbound,
          pressed && styles.pressed,
        ]}
      >
        <Minus size={20} color={colors.textPrimary} strokeWidth={2.4} />
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.label}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        {boundDown && boundUp ? (
          <Link2 size={12} color={colors.connected} strokeWidth={2} />
        ) : null}
      </View>

      <Pressable
        testID={`${testIDBase}-up-btn`}
        onPress={tap(onUp)}
        style={({ pressed }) => [
          styles.btn,
          !boundUp && styles.unbound,
          pressed && styles.pressed,
        ]}
      >
        <Plus size={20} color={colors.textPrimary} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  btn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  unbound: { borderStyle: "dashed", borderColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfacePressed, opacity: 0.9 },
  center: { flex: 1, alignItems: "center", gap: 3 },
  label: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 15 },
  sub: {
    color: colors.textTertiary,
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
