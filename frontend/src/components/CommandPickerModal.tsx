import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, X } from "lucide-react-native";

import { Command } from "@/src/api/client";
import { shortUuid } from "@/src/ble/hex";
import { colors, fonts, radius, spacing } from "@/src/theme/colors";

type Props = {
  visible: boolean;
  controlLabel: string;
  commands: Command[];
  currentId?: string | null;
  onSelect: (commandId: string | null) => void;
  onClose: () => void;
};

export function CommandPickerModal({
  visible,
  controlLabel,
  commands,
  currentId,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <View style={styles.backdrop} testID="command-picker-modal">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Associer « {controlLabel} »</Text>
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {currentId ? (
            <Pressable
              testID="picker-unbind"
              onPress={() => onSelect(null)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <X size={16} color={colors.disconnected} strokeWidth={2} />
              <Text style={styles.unbindText}>Retirer l&apos;association</Text>
            </Pressable>
          ) : null}

          {commands.length === 0 ? (
            <Text style={styles.empty}>
              Aucune commande enregistrée. Découvrez-en dans l&apos;Explorateur BLE.
            </Text>
          ) : (
            commands.map((c) => {
              const active = c.id === currentId;
              return (
                <Pressable
                  key={c.id}
                  testID={`picker-cmd-${c.id}`}
                  onPress={() => onSelect(c.id)}
                  style={({ pressed }) => [
                    styles.row,
                    active && styles.rowActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.rowInfo}>
                    <Text style={styles.cmdName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={styles.cmdMeta} numberOfLines={1}>
                      {c.characteristic_uuid ? shortUuid(c.characteristic_uuid) : "—"} ·{" "}
                      {c.payload_hex || "∅"}
                    </Text>
                  </View>
                  {active ? (
                    <Check size={18} color={colors.connected} strokeWidth={2.4} />
                  ) : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
    zIndex: 900,
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    maxHeight: "70%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },
  title: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16, marginBottom: spacing.md },
  list: { flexGrow: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowActive: { borderColor: colors.connected },
  rowInfo: { flex: 1 },
  cmdName: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14 },
  cmdMeta: { color: colors.textTertiary, fontFamily: fonts.mono, fontSize: 11, marginTop: 3 },
  unbindText: { color: colors.disconnected, fontFamily: fonts.semibold, fontSize: 14 },
  empty: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 13, textAlign: "center", paddingVertical: spacing.lg, lineHeight: 19 },
  pressed: { opacity: 0.85 },
});
