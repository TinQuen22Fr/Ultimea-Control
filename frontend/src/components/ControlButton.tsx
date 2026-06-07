import React from "react";
import { Pressable, StyleSheet, Text, View, Platform } from "react-native";
import * as Haptics from "expo-haptics";

import { colors, fonts } from "@/src/theme/colors";

type Props = {
  icon: React.ReactNode;
  label?: string;
  onPress: () => void;
  active?: boolean;
  bound?: boolean;
  danger?: boolean;
  size?: number;
  testID?: string;
};

export function ControlButton({
  icon,
  label,
  onPress,
  active = false,
  bound = true,
  danger = false,
  size = 60,
  testID,
}: Props) {
  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        testID={testID}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.btn,
          { width: size, height: size, borderRadius: size / 2 },
          active && styles.active,
          danger && active && styles.dangerActive,
          !bound && styles.unbound,
          pressed && styles.pressed,
        ]}
      >
        {icon}
      </Pressable>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8 },
  btn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  active: {
    borderColor: colors.white,
    backgroundColor: colors.surfacePressed,
    shadowColor: colors.white,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  dangerActive: {
    borderColor: colors.disconnected,
    shadowColor: colors.disconnected,
  },
  unbound: { borderStyle: "dashed", borderColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfacePressed, opacity: 0.9 },
  label: {
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
