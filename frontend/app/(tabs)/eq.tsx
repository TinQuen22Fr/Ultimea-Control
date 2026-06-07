import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Minus, Plus, RotateCcw, Save } from "lucide-react-native";

import { api, EqBand, Profile } from "@/src/api/client";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { VerticalSlider } from "@/src/components/VerticalSlider";
import { NamePromptModal } from "@/src/components/NamePromptModal";
import { useToast } from "@/src/components/ToastProvider";
import { useController } from "@/src/hooks/useController";
import { colors, fonts, radius, spacing } from "@/src/theme/colors";

const clampGain = (n: number) => Math.max(-12, Math.min(12, n));

export default function EqScreen() {
  const toast = useToast();
  const { sendControl } = useController();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bass, setBass] = useState(0);
  const [treble, setTreble] = useState(0);
  const [bands, setBands] = useState<EqBand[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const loadFrom = (p: Profile) => {
    setActiveId(p.id);
    setBass(p.bass);
    setTreble(p.treble);
    setBands(p.bands.map((b) => ({ ...b })));
    setDirty(false);
  };

  const load = useCallback(async () => {
    try {
      const list = await api.getProfiles();
      setProfiles(list);
      const active = list.find((p) => p.is_active) ?? list[0];
      if (active) loadFrom(active);
    } catch {
      toast.show("Impossible de charger les presets", "error");
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selectPreset = async (p: Profile) => {
    loadFrom(p);
    try {
      await api.activateProfile(p.id);
      setProfiles((prev) => prev.map((x) => ({ ...x, is_active: x.id === p.id })));
      toast.show(`Preset « ${p.name} » activé`, "success");
    } catch {
      toast.show("Activation impossible", "error");
    }
  };

  const updateBand = (idx: number, gain: number) => {
    setBands((prev) => prev.map((b, i) => (i === idx ? { ...b, gain } : b)));
    setDirty(true);
  };

  const reset = () => {
    const active = profiles.find((p) => p.id === activeId);
    if (active) loadFrom(active);
  };

  const saveAs = async (name: string) => {
    setSaveOpen(false);
    try {
      const created = await api.createProfile({ name, type: "eq", bass, treble, bands });
      await api.activateProfile(created.id);
      await load();
      toast.show(`Preset « ${name} » enregistré`, "success");
    } catch {
      toast.show("Enregistrement impossible", "error");
    }
  };

  const nudge = (control: string, delta: number, target: "bass" | "treble") => {
    if (target === "bass") setBass((v) => clampGain(v + delta));
    else setTreble((v) => clampGain(v + delta));
    setDirty(true);
    sendControl(control);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Égaliseur" subtitle="Courbe & tonalité" />

        {/* Presets */}
        <Text style={styles.overline}>PRESETS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetRow}
        >
          {profiles.map((p) => {
            const active = p.id === activeId;
            return (
              <Pressable
                key={p.id}
                testID={`preset-${p.name}`}
                onPress={() => selectPreset(p)}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Direct hardware nudge */}
        <Text style={styles.overline}>RÉGLAGE DIRECT</Text>
        <View style={styles.nudgeGrid}>
          <NudgeControl
            label="Basses"
            onMinus={() => nudge("bass_down", -1, "bass")}
            onPlus={() => nudge("bass_up", 1, "bass")}
            testIDBase="bass"
          />
          <NudgeControl
            label="Aigus"
            onMinus={() => nudge("treble_down", -1, "treble")}
            onPlus={() => nudge("treble_up", 1, "treble")}
            testIDBase="treble"
          />
        </View>

        {/* Tone + bands graphic EQ */}
        <View style={styles.eqHeaderRow}>
          <Text style={[styles.overline, { marginBottom: 0 }]}>COURBE (dB)</Text>
          {dirty ? <Text style={styles.dirty}>Modifié</Text> : null}
        </View>

        <View style={styles.eqPanel}>
          <View style={styles.slidersRow}>
            <VerticalSlider
              label="BASS"
              value={bass}
              onChange={(v) => {
                setBass(v);
                setDirty(true);
              }}
              testID="slider-bass"
            />
            <VerticalSlider
              label="TREBLE"
              value={treble}
              onChange={(v) => {
                setTreble(v);
                setDirty(true);
              }}
              testID="slider-treble"
            />
            <View style={styles.divider} />
            {bands.map((b, i) => (
              <VerticalSlider
                key={b.freq}
                label={b.freq}
                value={b.gain}
                onChange={(v) => updateBand(i, v)}
                testID={`slider-band-${i}`}
              />
            ))}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            testID="eq-reset-btn"
            onPress={reset}
            style={({ pressed }) => [styles.action, styles.actionGhost, pressed && styles.pressed]}
          >
            <RotateCcw size={16} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.actionGhostText}>Réinitialiser</Text>
          </Pressable>
          <Pressable
            testID="eq-save-btn"
            onPress={() => setSaveOpen(true)}
            style={({ pressed }) => [styles.action, styles.actionPrimary, pressed && styles.pressed]}
          >
            <Save size={16} color="#000" strokeWidth={2.2} />
            <Text style={styles.actionPrimaryText}>Enregistrer le preset</Text>
          </Pressable>
        </View>
      </ScrollView>

      <NamePromptModal
        visible={saveOpen}
        title="Nouveau preset d'égalisation"
        placeholder="Nom du preset"
        onSubmit={saveAs}
        onClose={() => setSaveOpen(false)}
      />
    </SafeAreaView>
  );
}

function NudgeControl({
  label,
  onMinus,
  onPlus,
  testIDBase,
}: {
  label: string;
  onMinus: () => void;
  onPlus: () => void;
  testIDBase: string;
}) {
  return (
    <View style={styles.nudge}>
      <Pressable
        testID={`${testIDBase}-down-btn`}
        onPress={onMinus}
        style={({ pressed }) => [styles.nudgeBtn, pressed && styles.pressed]}
      >
        <Minus size={18} color={colors.textPrimary} strokeWidth={2.2} />
      </Pressable>
      <Text style={styles.nudgeLabel}>{label}</Text>
      <Pressable
        testID={`${testIDBase}-up-btn`}
        onPress={onPlus}
        style={({ pressed }) => [styles.nudgeBtn, pressed && styles.pressed]}
      >
        <Plus size={18} color={colors.textPrimary} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120 },
  overline: {
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 2.4,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  presetRow: { gap: spacing.sm, paddingBottom: spacing.lg, paddingRight: spacing.xl },
  chip: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chipActive: { borderColor: colors.white, backgroundColor: colors.surfacePressed },
  chipPressed: { opacity: 0.85 },
  chipText: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 13 },
  chipTextActive: { color: colors.textPrimary },
  nudgeGrid: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  nudge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  nudgeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  nudgeLabel: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 13 },
  eqHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  dirty: {
    color: colors.warning,
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  eqPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  slidersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  divider: { width: 1, height: 168, backgroundColor: colors.borderSubtle, marginHorizontal: 2 },
  actionsRow: { flexDirection: "row", gap: spacing.md },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  actionGhost: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderStrong },
  actionGhostText: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 13 },
  actionPrimary: { backgroundColor: colors.white },
  actionPrimaryText: { color: "#000", fontFamily: fonts.bold, fontSize: 13 },
  pressed: { opacity: 0.85 },
});
