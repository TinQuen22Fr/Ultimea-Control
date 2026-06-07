import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Link2, Plus, Search, Trash2 } from "lucide-react-native";

import { api, Command } from "@/src/api/client";
import { shortUuid } from "@/src/ble/hex";
import { CommandPickerModal } from "@/src/components/CommandPickerModal";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { useToast } from "@/src/components/ToastProvider";
import {
  COMMAND_CATEGORIES,
  CONTROL_GROUPS,
  ControlDef,
} from "@/src/constants/controls";
import { colors, fonts, radius, spacing } from "@/src/theme/colors";

const catLabel = (key: string) =>
  COMMAND_CATEGORIES.find((c) => c.key === key)?.label ?? key;

export default function LibraryScreen() {
  const toast = useToast();
  const router = useRouter();
  const [commands, setCommands] = useState<Command[]>([]);
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<ControlDef | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, b] = await Promise.all([api.getCommands(), api.getBindings()]);
      setCommands(c);
      setBindings(b);
    } catch {
      toast.show("Chargement impossible", "error");
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const deleteCommand = async (cmd: Command) => {
    try {
      await api.deleteCommand(cmd.id);
      toast.show(`« ${cmd.name} » supprimée`, "success");
      load();
    } catch {
      toast.show("Suppression impossible", "error");
    }
  };

  const assign = async (commandId: string | null) => {
    if (!picker) return;
    const control = picker;
    setPicker(null);
    try {
      if (commandId) {
        await api.setBinding(control.key, commandId);
        toast.show(`Bouton « ${control.label} » associé`, "success");
      } else {
        await api.deleteBinding(control.key);
        toast.show(`Association retirée`, "info");
      }
      load();
    } catch {
      toast.show("Action impossible", "error");
    }
  };

  const boundCount = Object.keys(bindings).length;
  const cmdById = (id?: string) => commands.find((c) => c.id === id);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Bibliothèque" subtitle="Commandes & assignations" />

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{commands.length}</Text>
            <Text style={styles.statLabel}>Commandes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{boundCount}</Text>
            <Text style={styles.statLabel}>Boutons liés</Text>
          </View>
        </View>

        {/* Commands */}
        <Text style={styles.overline}>COMMANDES ENREGISTRÉES</Text>
        {commands.length === 0 ? (
          <Pressable
            testID="discover-cta"
            onPress={() => router.push("/explorer")}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Search size={18} color={colors.textPrimary} strokeWidth={2} />
            <View style={styles.ctaText}>
              <Text style={styles.ctaTitle}>Aucune commande</Text>
              <Text style={styles.ctaSub}>
                Ouvrez l&apos;Explorateur BLE pour découvrir et sauvegarder des
                commandes de votre barre de son.
              </Text>
            </View>
          </Pressable>
        ) : (
          commands.map((c) => (
            <View key={c.id} style={styles.cmdCard} testID={`cmd-card-${c.id}`}>
              <View style={styles.cmdLeft}>
                <View style={styles.cmdHeader}>
                  <Text style={styles.cmdName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <View style={styles.catBadge}>
                    <Text style={styles.catText}>{catLabel(c.category)}</Text>
                  </View>
                </View>
                <Text style={styles.cmdMeta} numberOfLines={1}>
                  {c.characteristic_uuid ? shortUuid(c.characteristic_uuid) : "—"} ·{" "}
                  {c.payload_hex || "∅"}
                </Text>
              </View>
              <Pressable
                testID={`delete-cmd-${c.id}`}
                onPress={() => deleteCommand(c)}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              >
                <Trash2 size={16} color={colors.disconnected} strokeWidth={2} />
              </Pressable>
            </View>
          ))
        )}

        {/* Bindings */}
        <Text style={[styles.overline, styles.mt]}>ASSIGNATION DES BOUTONS</Text>
        {CONTROL_GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.controls.map((control) => {
              const bound = cmdById(bindings[control.key]);
              return (
                <Pressable
                  key={control.key}
                  testID={`bind-${control.key}`}
                  onPress={() => setPicker(control)}
                  style={({ pressed }) => [styles.bindRow, pressed && styles.pressed]}
                >
                  <Text style={styles.bindLabel}>{control.label}</Text>
                  <View style={styles.bindRight}>
                    {bound ? (
                      <Text style={styles.bindValue} numberOfLines={1}>
                        {bound.name}
                      </Text>
                    ) : (
                      <Text style={styles.bindEmpty}>Non lié</Text>
                    )}
                    {bound ? (
                      <Link2 size={14} color={colors.connected} strokeWidth={2} />
                    ) : (
                      <Plus size={15} color={colors.textTertiary} strokeWidth={2} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <CommandPickerModal
        visible={!!picker}
        controlLabel={picker?.label ?? ""}
        commands={commands}
        currentId={picker ? bindings[picker.key] : null}
        onSelect={assign}
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120 },
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  statValue: { color: colors.textPrimary, fontFamily: fonts.light, fontSize: 34, letterSpacing: -1 },
  statLabel: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
  overline: {
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 2.4,
    marginBottom: spacing.md,
  },
  mt: { marginTop: spacing.xl },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: "dashed",
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  ctaText: { flex: 1 },
  ctaTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14 },
  ctaSub: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, marginTop: 4, lineHeight: 17 },
  cmdCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cmdLeft: { flex: 1 },
  cmdHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cmdName: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, flexShrink: 1 },
  catBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  catText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 0.3 },
  cmdMeta: { color: colors.textTertiary, fontFamily: fonts.mono, fontSize: 11, marginTop: 4 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  group: { marginBottom: spacing.lg },
  groupTitle: { color: colors.textTertiary, fontFamily: fonts.semibold, fontSize: 12, marginBottom: spacing.sm },
  bindRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  bindLabel: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 14, flexShrink: 1 },
  bindRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm, maxWidth: "55%" },
  bindValue: { color: colors.connected, fontFamily: fonts.semibold, fontSize: 13, flexShrink: 1 },
  bindEmpty: { color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 13 },
  pressed: { opacity: 0.85 },
});
