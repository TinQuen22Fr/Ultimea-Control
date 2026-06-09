import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bookmark } from "lucide-react-native";

import { COMMAND_CATEGORIES, CONTROL_GROUPS } from "@/src/constants/controls";
import { colors, fonts, radius, spacing } from "@/src/theme/colors";

export type SaveFramePayload = {
  name: string;
  category: string;
  hex: string;
  bindControl: string | null;
};

type Props = {
  visible: boolean;
  hex: string;
  defaultName?: string;
  defaultCategory?: string;
  charUuidShort?: string;
  onClose: () => void;
  onSave: (payload: SaveFramePayload) => void;
};

// Lightweight save sheet used by the Atelier (capture + frame builder).
// Hex is pre-filled and read-only; the user only names + categorises it.
export function SaveFrameModal({
  visible,
  hex,
  defaultName = "",
  defaultCategory = "custom",
  charUuidShort,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState(defaultCategory);
  const [bindControl, setBindControl] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(defaultName);
      setCategory(defaultCategory);
      setBindControl(null);
    }
  }, [visible, defaultName, defaultCategory]);

  if (!visible) return null;

  const handleSave = () => {
    if (!name.trim() || !hex) return;
    onSave({ name: name.trim(), category, hex, bindControl });
  };

  return (
    <View style={styles.backdrop} testID="save-frame-modal">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>TRAME CAPTURÉE</Text>
            <View style={styles.framePill}>
              <Text style={styles.frameHex} testID="save-frame-hex">
                {hex || "—"}
              </Text>
            </View>
            {charUuidShort ? (
              <Text style={styles.meta}>Caractéristique : {charUuidShort}</Text>
            ) : null}

            <Text style={[styles.label, styles.mt]}>NOM DE LA COMMANDE</Text>
            <TextInput
              testID="save-frame-name-input"
              value={name}
              onChangeText={setName}
              placeholder="ex. Muet, Source AUX, Mode Game…"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              autoFocus
              selectionColor={colors.white}
            />

            <Text style={[styles.label, styles.mt]}>CATÉGORIE</Text>
            <View style={styles.chipsWrap}>
              {COMMAND_CATEGORIES.map((c) => {
                const active = category === c.key;
                return (
                  <Pressable
                    key={c.key}
                    testID={`save-frame-cat-${c.key}`}
                    onPress={() => setCategory(c.key)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, styles.mt]}>
              ASSOCIER À UN BOUTON (OPTIONNEL)
            </Text>
            {bindControl ? (
              <Pressable
                testID="save-frame-bind-clear"
                onPress={() => setBindControl(null)}
                style={styles.clearBindRow}
              >
                <Text style={styles.clearBindText}>Retirer l&apos;association</Text>
              </Pressable>
            ) : null}
            {CONTROL_GROUPS.map((g) => (
              <View key={g.title} style={styles.bindGroup}>
                <Text style={styles.bindGroupTitle}>{g.title}</Text>
                <View style={styles.chipsWrap}>
                  {g.controls.map((ctrl) => {
                    const active = bindControl === ctrl.key;
                    return (
                      <Pressable
                        key={ctrl.key}
                        testID={`save-frame-bind-${ctrl.key}`}
                        onPress={() => setBindControl(active ? null : ctrl.key)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {ctrl.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              testID="save-frame-cancel"
              onPress={onClose}
              style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
            >
              <Text style={styles.btnGhostText}>Annuler</Text>
            </Pressable>
            <Pressable
              testID="save-frame-submit"
              onPress={handleSave}
              disabled={!name.trim() || !hex}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                (!name.trim() || !hex) && styles.btnDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Bookmark size={16} color="#000" strokeWidth={2.2} />
              <Text style={styles.btnPrimaryText}>Enregistrer</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardStickyView>
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
    maxHeight: "82%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },
  label: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.8 },
  mt: { marginTop: spacing.lg },
  framePill: {
    backgroundColor: colors.bgTerminal,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  frameHex: { color: colors.terminalLog, fontFamily: fonts.monoBold, fontSize: 15, letterSpacing: 1 },
  meta: { color: colors.textTertiary, fontFamily: fonts.mono, fontSize: 11, marginTop: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === "ios" ? spacing.md : spacing.sm,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 15,
    marginTop: spacing.sm,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  bindGroup: { marginTop: spacing.md },
  bindGroupTitle: {
    color: colors.textTertiary,
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  clearBindRow: { paddingVertical: 6, marginTop: 4 },
  clearBindText: { color: colors.disconnected, fontFamily: fonts.semibold, fontSize: 13 },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  chipActive: { backgroundColor: colors.white, borderColor: colors.white },
  chipText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 12 },
  chipTextActive: { color: "#000" },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  btnGhostText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14 },
  btnPrimary: { backgroundColor: colors.white },
  btnPrimaryText: { color: "#000", fontFamily: fonts.bold, fontSize: 14 },
  btnDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
});
