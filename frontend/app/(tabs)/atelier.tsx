import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Activity,
  Bluetooth,
  ChevronRight,
  Ear,
  Minus,
  Plus,
  Save,
  Send,
  Share2,
  Trash2,
} from "lucide-react-native";

import { api } from "@/src/api/client";
import { useBle } from "@/src/ble/BleContext";
import {
  AURA_PREFIX,
  buildAuraFrame,
  normalizeHex,
  shortUuid,
} from "@/src/ble/hex";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { SaveFrameModal, SaveFramePayload } from "@/src/components/SaveFrameModal";
import { useToast } from "@/src/components/ToastProvider";
import { colors, fonts, radius, spacing } from "@/src/theme/colors";

type SaveCtx = {
  hex: string;
  serviceUuid: string;
  charUuid: string;
  charUuidShort: string;
  source: "capture" | "builder";
};

const stepHex = (hexStr: string, delta: number) => {
  const n = parseInt(normalizeHex(hexStr) || "0", 16);
  const next = ((Number.isNaN(n) ? 0 : n) + delta + 256) & 0xff;
  return next.toString(16).padStart(2, "0").toUpperCase();
};

export default function AtelierScreen() {
  const ble = useBle();
  const toast = useToast();
  const router = useRouter();

  const connected = ble.connectionState === "connected";

  const [listening, setListening] = useState(false);
  const [selectedCharKey, setSelectedCharKey] = useState<string | null>(null);
  const [prefix, setPrefix] = useState(AURA_PREFIX);
  const [param, setParam] = useState("03");
  const [value, setValue] = useState("10");
  const [withResponse, setWithResponse] = useState(true);
  const [saveCtx, setSaveCtx] = useState<SaveCtx | null>(null);

  const writableChars = useMemo(() => {
    const out: {
      serviceUuid: string;
      charUuid: string;
      withResp: boolean;
      withoutResp: boolean;
    }[] = [];
    ble.services.forEach((s) =>
      s.characteristics.forEach((c) => {
        if (c.isWritableWithResponse || c.isWritableWithoutResponse) {
          out.push({
            serviceUuid: s.uuid,
            charUuid: c.uuid,
            withResp: c.isWritableWithResponse,
            withoutResp: c.isWritableWithoutResponse,
          });
        }
      }),
    );
    return out;
  }, [ble.services]);

  const target =
    writableChars.find((c) => `${c.serviceUuid}|${c.charUuid}` === selectedCharKey) ??
    writableChars[0] ??
    null;

  // Default the write-type to whatever the selected characteristic supports.
  useEffect(() => {
    if (target && !target.withResp && target.withoutResp) setWithResponse(false);
  }, [target?.charUuid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!connected) setListening(false);
  }, [connected]);

  const built = buildAuraFrame(prefix, param, value);

  const toggleListen = useCallback(() => {
    if (listening) {
      ble.stopAllMonitors();
      setListening(false);
    } else {
      ble.monitorAll();
      setListening(true);
      toast.show("Écoute active — appuyez sur la télécommande", "info");
    }
  }, [listening, ble, toast]);

  const sendBuilt = useCallback(async () => {
    if (!target) {
      toast.show("Aucune caractéristique d'écriture détectée", "warn");
      return;
    }
    try {
      await ble.writeHex(target.serviceUuid, target.charUuid, built.hex, withResponse);
      toast.show(`Trame envoyée : ${built.hex}`, "success");
      api
        .createLog({
          action: "write",
          characteristic_uuid: target.charUuid,
          value_hex: built.hex,
          message: "Atelier — constructeur",
        })
        .catch(() => {});
    } catch (e: any) {
      toast.show(`Échec : ${e?.message || e}`, "error");
    }
  }, [target, built.hex, withResponse, ble, toast]);

  const openSaveCapture = (item: { hex: string; serviceUuid: string; charUuid: string }) => {
    const svc = target?.serviceUuid ?? item.serviceUuid;
    const chr = target?.charUuid ?? item.charUuid;
    setSaveCtx({
      hex: item.hex,
      serviceUuid: svc,
      charUuid: chr,
      charUuidShort: shortUuid(chr),
      source: "capture",
    });
  };

  const openSaveBuilt = () => {
    if (!target) {
      toast.show("Aucune caractéristique d'écriture détectée", "warn");
      return;
    }
    setSaveCtx({
      hex: built.hex,
      serviceUuid: target.serviceUuid,
      charUuid: target.charUuid,
      charUuidShort: shortUuid(target.charUuid),
      source: "builder",
    });
  };

  const handleSave = async (payload: SaveFramePayload) => {
    if (!saveCtx) return;
    try {
      const cmd = await api.createCommand({
        name: payload.name,
        category: payload.category,
        service_uuid: saveCtx.serviceUuid,
        characteristic_uuid: saveCtx.charUuid,
        payload_hex: payload.hex,
        write_type:
          saveCtx.source === "builder" && !withResponse
            ? "withoutResponse"
            : "withResponse",
      });
      if (payload.bindControl) {
        await api.setBinding(payload.bindControl, cmd.id);
        toast.show(`« ${payload.name} » enregistrée et associée`, "success");
      } else {
        toast.show(`Commande « ${payload.name} » enregistrée`, "success");
      }
      setSaveCtx(null);
    } catch {
      toast.show("Échec de l'enregistrement", "error");
    }
  };

  const [exporting, setExporting] = useState(false);
  const onExport = useCallback(async () => {
    setExporting(true);
    try {
      const commands = await api.getCommands();
      const bundle = {
        device_name: ble.connectedDevice?.name ?? null,
        note: `Export AuraControl ${new Date().toLocaleString("fr-FR")}`,
        captures: ble.captures.map((c) => ({
          ts: c.ts,
          char_uuid: c.charUuid,
          hex: c.hex,
        })),
        commands: commands.map((c) => ({
          name: c.name,
          category: c.category,
          char_uuid: c.characteristic_uuid ?? null,
          payload_hex: c.payload_hex,
        })),
      };
      const saved = await api.createExport(bundle);
      const lines: string[] = [];
      lines.push(`AuraControl — Export (${bundle.device_name ?? "appareil ?"})`);
      lines.push(`ID: ${saved.id}`);
      lines.push("");
      lines.push(`== CODES CAPTURÉS (${bundle.captures.length}) ==`);
      bundle.captures.forEach((c) =>
        lines.push(`${c.ts}  ${(c.char_uuid ?? "").slice(0, 8)}  ${c.hex}`),
      );
      lines.push("");
      lines.push(`== COMMANDES ENREGISTRÉES (${bundle.commands.length}) ==`);
      bundle.commands.forEach((c) =>
        lines.push(`${c.name} [${c.category}]  ${c.payload_hex}`),
      );
      try {
        await Share.share({ message: lines.join("\n"), title: "Export AuraControl" });
      } catch {
        // user dismissed the share sheet — export is still saved server-side
      }
      toast.show(
        `Export prêt : ${bundle.captures.length} codes, ${bundle.commands.length} cmds`,
        "success",
      );
    } catch (e: any) {
      toast.show(`Échec export : ${e?.message || e}`, "error");
    } finally {
      setExporting(false);
    }
  }, [ble.captures, ble.connectedDevice, toast]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Atelier" subtitle="Découverte du protocole" />

        {!connected ? (
          <View style={styles.infoCard} testID="atelier-disconnected-card">
            <Bluetooth size={18} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.infoText}>
              Connectez d&apos;abord la barre de son depuis l&apos;Explorateur, puis
              revenez ici pour capturer et tester des commandes.
            </Text>
            <Pressable
              testID="goto-explorer-btn"
              onPress={() => router.push("/explorer")}
              style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            >
              <Text style={styles.linkText}>Aller à l&apos;Explorateur</Text>
              <ChevronRight size={15} color="#000" strokeWidth={2.4} />
            </Pressable>
          </View>
        ) : (
          <>
            {/* ---------- Capture ---------- */}
            <Text style={styles.overline}>CAPTURE TÉLÉCOMMANDE</Text>
            <View style={styles.stepsCard}>
              <Text style={styles.step}>1. Activez l&apos;écoute ci-dessous.</Text>
              <Text style={styles.step}>
                2. Appuyez sur un bouton de votre télécommande physique (Muet,
                Source, Mode…).
              </Text>
              <Text style={styles.step}>
                3. Le code apparaît — appuyez sur « Enregistrer » pour le garder.
              </Text>
            </View>

            <Pressable
              testID="listen-toggle-btn"
              onPress={toggleListen}
              style={({ pressed }) => [
                styles.listenBtn,
                listening && styles.listenBtnActive,
                pressed && styles.pressed,
              ]}
            >
              <Ear
                size={18}
                color={listening ? colors.terminalLog : "#000"}
                strokeWidth={2.2}
              />
              <Text style={[styles.listenText, listening && styles.listenTextActive]}>
                {listening ? "Écoute active — en attente…" : "Écouter les notifications"}
              </Text>
            </Pressable>

            <View style={styles.captureHead}>
              <Text style={styles.subOverline}>
                CODES CAPTURÉS ({ble.captures.length})
              </Text>
              <View style={styles.headBtns}>
                <Pressable
                  testID="export-btn"
                  onPress={onExport}
                  disabled={exporting}
                  style={({ pressed }) => [
                    styles.exportBtn,
                    (pressed || exporting) && styles.pressed,
                  ]}
                >
                  <Share2 size={13} color="#000" strokeWidth={2.2} />
                  <Text style={styles.exportText}>
                    {exporting ? "Export…" : "Exporter"}
                  </Text>
                </Pressable>
                {ble.captures.length > 0 ? (
                  <Pressable
                    testID="clear-captures-btn"
                    onPress={ble.clearCaptures}
                    style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
                  >
                    <Trash2 size={13} color={colors.textTertiary} strokeWidth={2} />
                    <Text style={styles.clearText}>Effacer</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {ble.captures.length === 0 ? (
              <Text style={styles.empty}>
                Aucun code pour l&apos;instant. Activez l&apos;écoute puis appuyez sur
                votre télécommande.
              </Text>
            ) : (
              ble.captures.map((c) => (
                <View key={c.id} style={styles.captureRow} testID={`capture-${c.id}`}>
                  <View style={styles.captureLeft}>
                    <Text style={styles.captureHex}>{c.hex}</Text>
                    <Text style={styles.captureMeta}>
                      {c.ts} · {shortUuid(c.charUuid)}
                    </Text>
                  </View>
                  <Pressable
                    testID={`save-capture-${c.id}`}
                    onPress={() => openSaveCapture(c)}
                    style={({ pressed }) => [styles.saveMini, pressed && styles.pressed]}
                  >
                    <Save size={14} color={colors.textPrimary} strokeWidth={2} />
                  </Pressable>
                </View>
              ))
            )}

            {/* ---------- Frame builder ---------- */}
            <Text style={[styles.overline, styles.mt]}>CONSTRUCTEUR DE TRAMES</Text>

            {writableChars.length > 0 ? (
              <>
                <Text style={styles.fieldLabel}>CARACTÉRISTIQUE D&apos;ÉCRITURE</Text>
                <View style={styles.charChips}>
                  {writableChars.map((c) => {
                    const key = `${c.serviceUuid}|${c.charUuid}`;
                    const active = target
                      ? `${target.serviceUuid}|${target.charUuid}` === key
                      : false;
                    return (
                      <Pressable
                        key={key}
                        testID={`target-char-${c.charUuid}`}
                        onPress={() => setSelectedCharKey(key)}
                        style={[styles.charChip, active && styles.charChipActive]}
                      >
                        <Text style={[styles.charChipText, active && styles.charChipTextActive]}>
                          {shortUuid(c.charUuid)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <Text style={styles.empty}>
                Aucune caractéristique inscriptible détectée sur cet appareil.
              </Text>
            )}

            <Text style={styles.fieldLabel}>PRÉFIXE</Text>
            <TextInput
              testID="builder-prefix-input"
              value={prefix}
              onChangeText={setPrefix}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, styles.mono]}
              selectionColor={colors.white}
            />

            <View style={styles.byteRow}>
              <View style={styles.byteCol}>
                <Text style={styles.fieldLabel}>PARAM (fonction)</Text>
                <ByteInput
                  testID="builder-param"
                  value={param}
                  onChange={setParam}
                />
              </View>
              <View style={styles.byteCol}>
                <Text style={styles.fieldLabel}>VALEUR</Text>
                <ByteInput
                  testID="builder-value"
                  value={value}
                  onChange={setValue}
                />
              </View>
            </View>

            <View style={styles.previewCard}>
              <View>
                <Text style={styles.previewLabel}>TRAME COMPLÈTE</Text>
                <Text style={styles.previewHex} testID="builder-frame-preview">
                  {built.hex}
                </Text>
              </View>
              <View style={styles.checksumPill}>
                <Text style={styles.checksumLabel}>CHK</Text>
                <Text style={styles.checksumValue}>
                  {built.checksum.toString(16).padStart(2, "0").toUpperCase()}
                </Text>
              </View>
            </View>

            <Pressable
              testID="builder-wr-toggle"
              onPress={() => setWithResponse((v) => !v)}
              style={styles.wrRow}
            >
              <View style={[styles.checkbox, withResponse && styles.checkboxOn]} />
              <Text style={styles.wrText}>Écriture avec réponse (ACK)</Text>
            </Pressable>

            <View style={styles.builderActions}>
              <Pressable
                testID="builder-send-btn"
                onPress={sendBuilt}
                disabled={!target}
                style={({ pressed }) => [
                  styles.actBtn,
                  styles.actGhost,
                  !target && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Send size={16} color={colors.textPrimary} strokeWidth={2} />
                <Text style={styles.actGhostText}>Envoyer</Text>
              </Pressable>
              <Pressable
                testID="builder-save-btn"
                onPress={openSaveBuilt}
                disabled={!target}
                style={({ pressed }) => [
                  styles.actBtn,
                  styles.actPrimary,
                  !target && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Save size={16} color="#000" strokeWidth={2.2} />
                <Text style={styles.actPrimaryText}>Enregistrer</Text>
              </Pressable>
            </View>

            <View style={styles.hintRow}>
              <Activity size={13} color={colors.textTertiary} strokeWidth={2} />
              <Text style={styles.hint}>
                Confirmé : Param 03 = Volume (valeur absolue). Astuce : envoyez une
                trame, observez la barre, puis incrémentez « Param » (04, 05, 06, 07…)
                pour découvrir Muet, Sources et Modes.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <SaveFrameModal
        visible={!!saveCtx}
        hex={saveCtx?.hex ?? ""}
        charUuidShort={saveCtx?.charUuidShort}
        onClose={() => setSaveCtx(null)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

function ByteInput({
  value,
  onChange,
  testID,
}: {
  value: string;
  onChange: (v: string) => void;
  testID: string;
}) {
  return (
    <View style={styles.byteInputRow}>
      <Pressable
        testID={`${testID}-minus`}
        onPress={() => onChange(stepHex(value, -1))}
        style={({ pressed }) => [styles.byteBtn, pressed && styles.pressed]}
      >
        <Minus size={16} color={colors.textPrimary} strokeWidth={2.4} />
      </Pressable>
      <TextInput
        testID={`${testID}-input`}
        value={value}
        onChangeText={(t) => onChange(normalizeHex(t).slice(0, 2))}
        autoCapitalize="characters"
        autoCorrect={false}
        keyboardType="default"
        style={styles.byteInput}
        selectionColor={colors.white}
        maxLength={2}
      />
      <Pressable
        testID={`${testID}-plus`}
        onPress={() => onChange(stepHex(value, 1))}
        style={({ pressed }) => [styles.byteBtn, pressed && styles.pressed]}
      >
        <Plus size={16} color={colors.textPrimary} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120 },
  infoCard: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  infoText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  linkText: { color: "#000", fontFamily: fonts.bold, fontSize: 14 },
  overline: {
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 2.4,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  subOverline: {
    color: colors.textTertiary,
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  mt: { marginTop: spacing.xl },
  stepsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 8,
    marginBottom: spacing.md,
  },
  step: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  listenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  listenBtnActive: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.terminalLog,
  },
  listenText: { color: "#000", fontFamily: fonts.bold, fontSize: 15 },
  listenTextActive: { color: colors.terminalLog },
  captureHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4 },
  clearText: { color: colors.textTertiary, fontFamily: fonts.medium, fontSize: 12 },
  headBtns: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
  },
  exportText: { color: "#000", fontFamily: fonts.bold, fontSize: 12 },
  empty: {
    color: colors.textTertiary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  captureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgTerminal,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  captureLeft: { flex: 1 },
  captureHex: { color: colors.terminalLog, fontFamily: fonts.monoBold, fontSize: 14, letterSpacing: 0.5 },
  captureMeta: { color: colors.textTertiary, fontFamily: fonts.mono, fontSize: 11, marginTop: 4 },
  saveMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.6,
    marginBottom: 6,
    marginTop: spacing.md,
  },
  charChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  charChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  charChipActive: { backgroundColor: colors.white, borderColor: colors.white },
  charChipText: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 11 },
  charChipTextActive: { color: "#000" },
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
  },
  mono: { fontFamily: fonts.mono, letterSpacing: 1 },
  byteRow: { flexDirection: "row", gap: spacing.md },
  byteCol: { flex: 1 },
  byteInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  byteBtn: {
    width: 40,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  byteInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingVertical: Platform.OS === "ios" ? spacing.md : spacing.sm,
    color: colors.textPrimary,
    fontFamily: fonts.monoBold,
    fontSize: 18,
    letterSpacing: 2,
    textAlign: "center",
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgTerminal,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  previewLabel: { color: colors.textTertiary, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.6 },
  previewHex: { color: colors.terminalLog, fontFamily: fonts.monoBold, fontSize: 16, letterSpacing: 1, marginTop: 5 },
  checksumPill: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginLeft: spacing.md,
  },
  checksumLabel: { color: colors.textTertiary, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1 },
  checksumValue: { color: colors.textPrimary, fontFamily: fonts.monoBold, fontSize: 16, marginTop: 2 },
  wrRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  checkboxOn: { backgroundColor: colors.white, borderColor: colors.white },
  wrText: { color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 13 },
  builderActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  actBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  actGhost: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderStrong },
  actGhostText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14 },
  actPrimary: { backgroundColor: colors.white },
  actPrimaryText: { color: "#000", fontFamily: fonts.bold, fontSize: 14 },
  disabled: { opacity: 0.4 },
  hintRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, alignItems: "flex-start" },
  hint: { flex: 1, color: colors.textTertiary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.85 },
});
