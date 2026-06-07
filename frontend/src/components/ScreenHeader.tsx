import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bluetooth, BluetoothConnected, BluetoothSearching } from "lucide-react-native";

import { useBle } from "@/src/ble/BleContext";
import { colors, fonts, radius, spacing } from "@/src/theme/colors";

export function ConnectionBadge() {
  const router = useRouter();
  const { connectionState, connectedDevice } = useBle();

  const connected = connectionState === "connected";
  const connecting = connectionState === "connecting";
  const dotColor = connected
    ? colors.connected
    : connecting
      ? colors.warning
      : colors.disconnected;
  const label = connected
    ? connectedDevice?.name ?? "Connecté"
    : connecting
      ? "Connexion…"
      : "Déconnecté";

  const Icon = connected
    ? BluetoothConnected
    : connecting
      ? BluetoothSearching
      : Bluetooth;

  return (
    <Pressable
      testID="connection-badge"
      onPress={() => router.push("/explorer")}
      style={({ pressed }) => [styles.badge, pressed && styles.pressed]}
    >
      <Icon size={14} color={dotColor} strokeWidth={2} />
      <Text style={styles.badgeText} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
    </Pressable>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  showBadge = true,
}: {
  title: string;
  subtitle?: string;
  showBadge?: boolean;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {showBadge ? <ConnectionBadge /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerText: { flexShrink: 1 },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    maxWidth: 150,
  },
  pressed: { backgroundColor: colors.surfacePressed },
  badgeText: {
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
    flexShrink: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
