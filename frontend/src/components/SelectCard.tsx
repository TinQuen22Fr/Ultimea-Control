import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Link2 } from "lucide-react-native";

import { colors, fonts, radius, spacing } from "@/src/theme/colors";

type Props = {
  label: string;
  sub?: string;
  selected?: boolean;
  bound?: boolean;
  onPress: () => void;
  testID?: string;
  flexBasis?: number | string;
};

export function SelectCard({
  label,
  sub,
  selected = false,
  bound = true,
  onPress,
  testID,
  flexBasis,
}: Props) {
  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        flexBasis !== undefined ? { flexBasis: flexBasis as any, flexGrow: 1 } : null,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
          {label}
        </Text>
        {!bound ? <Link2 size={13} color={colors.textTertiary} strokeWidth={2} /> : null}
      </View>
      {sub ? (
        <Text style={[styles.sub, selected && styles.subSelected]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 64,
    justifyContent: "center",
  },
  selected: {
    borderColor: colors.white,
    shadowColor: colors.white,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  pressed: { backgroundColor: colors.surfacePressed },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  label: {
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  labelSelected: { color: colors.textPrimary },
  sub: {
    color: colors.textTertiary,
    fontFamily: fonts.medium,
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  subSelected: { color: colors.textSecondary },
});
