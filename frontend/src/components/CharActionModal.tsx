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
import { Send, Bookmark } from "lucide-react-native";

import { CharInfo } from "@/src/ble/BleContext";
import { isValidHex, shortUuid } from "@/src/ble/hex";
import { COMMAND_CATEGORIES } from "@/src/constants/controls";
import { colors, fonts, radius, spacing } from "@/src/theme/colors";

type SavePayload = {
  name: string;
  category: string;
  hex: string;
  writeType: "withResponse" | "withoutResponse";
};

type Props = {
  visible: boolean;
  char: CharInfo | null;
  connected: boolean;
  onClose: () => void;
  onWrite: (hex: string, withResponse: boolean) => void;
  onSave: (payload: SavePayload) => void;
};

export function CharActionModal({
  visible,
  char,
  connected,
  onClose,
  onWrite,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("custom");
  const [hex, setHex] = useState("");
  const [withResponse, setWithResponse] = useState(true);

  useEffect(() => {
    if (visible && char) {
      setName("");
      setCategory("custom");
      setHex("");
      setWithResponse(char.isWritableWithResponse || !char.isWritableWithoutResponse);
    }
  }, [visible, char]);

  if (!visible || !char) return null;

  const hexOk = isValidHex(hex);
  const canToggleType = char.isWritableWithResponse && char.isWritableWithoutResponse;

  const handleTest = () => {
    if (!hexOk) return;
    onWrite(hex, withResponse);
  };

  const handleSave = () => {
    if (!name.trim() || !hexOk) return;
    onSave({ name: name.trim(), category, hex, writeType: withResponse ? "withResponse" : "withoutResponse" });
  };

  return (
    <View style={styles.backdrop} testID="char-action-modal">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>CARACTÉRISTIQUE</Text>
            <Text style={styles.uuid}>{shortUuid(char.uuid)}</Text>

            <Text style={[styles.label, styles.mt]}>NOM DE LA COMMANDE</Text>
            <TextInput
              testID="cmd-name-input"
              value={name}
              onChangeText={setName}
              placeholder="ex. Volume +"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              selectionColor={colors.white}
            />

            <Text style={[styles.label, styles.mt]}>CATÉGORIE</Text>
            <View style={styles.chipsWrap}>
              {COMMAND_CATEGORIES.map((c) => {
                const active = category === c.key;
                return (
                  <Pressable
                    key={c.key}
                    testID={`cat-${c.key}`}
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

            <Text style={[styles.label, styles.mt]}>PAYLOAD (HEX)</Text>
            <TextInput
              testID="cmd-hex-input"
              value={hex}
              onChangeText={setHex}
              placeholder="ex. A5 01 00"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, styles.mono]}
              selectionColor={colors.white}
            />
            {hex.length > 0 && !hexOk ? (
              <Text style={styles.err}>Hex invalide (octets à 2 chiffres)</Text>
            ) : null}

            {canToggleType ? (
              <Pressable
                style={styles.typeRow}
                onPress={() => setWithResponse((v) => !v)}
                testID="write-type-toggle"
              >
                <View style={[styles.checkbox, withResponse && styles.checkboxOn]} />
                <Text style={styles.typeText}>Écriture avec réponse (ACK)</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              testID="char-test-btn"
              onPress={handleTest}
              disabled={!connected || !hexOk}
              style={({ pressed }) => [
                styles.btn,
                styles.btnGhost,
                (!connected || !hexOk) && styles.btnDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Send size={16} color={colors.textPrimary} strokeWidth={2} />
              <Text style={styles.btnGhostText}>Tester</Text>
            </Pressable>
            <Pressable
              testID="char-save-btn"
              onPress={handleSave}
              disabled={!name.trim() || !hexOk}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                (!name.trim() || !hexOk) && styles.btnDisabled,
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
  label: {
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.8,
  },
  mt: { marginTop: spacing.lg },
  uuid: {
    color: colors.terminalLog,
    fontFamily: fonts.mono,
    fontSize: 13,
    marginTop: 6,
  },
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
  mono: { fontFamily: fonts.mono, letterSpacing: 1 },
  err: { color: colors.disconnected, fontFamily: fonts.medium, fontSize: 11, marginTop: 6 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
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
  typeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  checkboxOn: { backgroundColor: colors.white, borderColor: colors.white },
  typeText: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 13 },
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
