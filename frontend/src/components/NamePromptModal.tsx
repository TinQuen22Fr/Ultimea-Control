import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius, spacing } from "@/src/theme/colors";

type Props = {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
};

// In-tree overlay (not a native Modal) so the keyboard-controller context
// applies and the input rises above the keyboard reliably.
export function NamePromptModal({
  visible,
  title,
  placeholder,
  initialValue = "",
  submitLabel = "Enregistrer",
  onSubmit,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  if (!visible) return null;

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <View style={styles.backdrop} testID="name-prompt-modal">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <TextInput
            testID="name-prompt-input"
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            autoFocus
            selectionColor={colors.white}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View style={styles.row}>
            <Pressable
              testID="name-prompt-cancel"
              onPress={onClose}
              style={({ pressed }) => [
                styles.btn,
                styles.btnGhost,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.btnGhostText}>Annuler</Text>
            </Pressable>
            <Pressable
              testID="name-prompt-submit"
              onPress={submit}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.btnPrimaryText}>{submitLabel}</Text>
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
    backgroundColor: "rgba(0,0,0,0.6)",
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
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 17,
    marginBottom: spacing.md,
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
    marginBottom: spacing.lg,
  },
  row: { flexDirection: "row", gap: spacing.md },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  btnGhostText: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 14 },
  btnPrimary: { backgroundColor: colors.white },
  btnPrimaryText: { color: "#000", fontFamily: fonts.bold, fontSize: 14 },
  pressed: { opacity: 0.85 },
});
