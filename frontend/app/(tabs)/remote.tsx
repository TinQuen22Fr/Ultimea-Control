import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Minus, Plus, Power, TriangleAlert, Volume2, VolumeX } from "lucide-react-native";

import { ControlButton } from "@/src/components/ControlButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { SelectCard } from "@/src/components/SelectCard";
import { VolumeDial } from "@/src/components/VolumeDial";
import { useBle } from "@/src/ble/BleContext";
import { useController } from "@/src/hooks/useController";
import { SOUND_MODES, SOURCES } from "@/src/constants/controls";
import { storage } from "@/src/utils/storage";
import { colors, fonts, radius, spacing } from "@/src/theme/colors";

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export default function RemoteScreen() {
  const { bleAvailable } = useBle();
  const { reload, sendControl, isBound } = useController();

  const [volume, setVolume] = useState(30);
  const [muted, setMuted] = useState(false);
  const [activeMode, setActiveMode] = useState<string>("atmos");
  const [activeSource, setActiveSource] = useState<string>("optical");

  useEffect(() => {
    (async () => {
      setVolume((await storage.getItem("ac_volume", 30)) ?? 30);
      setMuted((await storage.getItem("ac_muted", false)) ?? false);
      setActiveMode((await storage.getItem("ac_mode", "atmos")) ?? "atmos");
      setActiveSource((await storage.getItem("ac_source", "optical")) ?? "optical");
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onVolumeChange = (v: number) => {
    setVolume(v);
    storage.setItem("ac_volume", v);
  };

  const onVolUp = () => {
    const next = clamp(volume + 2);
    onVolumeChange(next);
    if (muted) {
      setMuted(false);
      storage.setItem("ac_muted", false);
    }
    sendControl("volume_up");
  };

  const onVolDown = () => {
    onVolumeChange(clamp(volume - 2));
    sendControl("volume_down");
  };

  const onMute = () => {
    const next = !muted;
    setMuted(next);
    storage.setItem("ac_muted", next);
    sendControl("mute");
  };

  const onPower = () => sendControl("power");

  const selectMode = (key: string, control: string, label: string) => {
    setActiveMode(key);
    storage.setItem("ac_mode", key);
    sendControl(control, label);
  };

  const selectSource = (key: string, control: string, label: string) => {
    setActiveSource(key);
    storage.setItem("ac_source", key);
    sendControl(control, label);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="AuraControl" subtitle="Ultimea Aura A40" />

        {!bleAvailable ? (
          <View style={styles.demoBanner} testID="demo-banner">
            <TriangleAlert size={15} color={colors.warning} strokeWidth={2} />
            <Text style={styles.demoText}>
              Mode démo — connectez-vous via un build Android réel pour piloter en
              Bluetooth.
            </Text>
          </View>
        ) : null}

        {/* Volume */}
        <View style={styles.dialRow}>
          <ControlButton
            icon={<Minus size={22} color={colors.textPrimary} strokeWidth={2.2} />}
            onPress={onVolDown}
            size={56}
            bound={isBound("volume_down")}
            testID="volume-down-btn"
          />
          <VolumeDial value={volume} muted={muted} onChange={onVolumeChange} size={236} />
          <ControlButton
            icon={<Plus size={22} color={colors.textPrimary} strokeWidth={2.2} />}
            onPress={onVolUp}
            size={56}
            bound={isBound("volume_up")}
            testID="volume-up-btn"
          />
        </View>

        <View style={styles.powerRow}>
          <ControlButton
            icon={<Power size={24} color={colors.textPrimary} strokeWidth={1.8} />}
            label="Marche / Arrêt"
            onPress={onPower}
            bound={isBound("power")}
            testID="power-btn"
          />
          <ControlButton
            icon={
              muted ? (
                <VolumeX size={24} color={colors.disconnected} strokeWidth={1.8} />
              ) : (
                <Volume2 size={24} color={colors.textPrimary} strokeWidth={1.8} />
              )
            }
            label="Muet"
            onPress={onMute}
            active={muted}
            danger
            bound={isBound("mute")}
            testID="mute-btn"
          />
        </View>

        {/* Sound modes */}
        <Text style={styles.overline}>MODES SON</Text>
        <View style={styles.grid}>
          {SOUND_MODES.map((m) => (
            <SelectCard
              key={m.key}
              label={m.label}
              sub={m.sub}
              selected={activeMode === m.key}
              bound={isBound(m.control)}
              onPress={() => selectMode(m.key, m.control, m.label)}
              flexBasis="47%"
              testID={`mode-${m.key}-card`}
            />
          ))}
        </View>

        {/* Sources */}
        <Text style={styles.overline}>SOURCE D&apos;ENTRÉE</Text>
        <View style={styles.grid}>
          {SOURCES.map((s) => (
            <SelectCard
              key={s.key}
              label={s.label}
              sub={s.sub}
              selected={activeSource === s.key}
              bound={isBound(s.control)}
              onPress={() => selectSource(s.key, s.control, s.label)}
              flexBasis="30%"
              testID={`source-${s.key}-card`}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 120,
  },
  demoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  demoText: {
    flex: 1,
    color: colors.warning,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  dialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  powerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xxxl,
    marginBottom: spacing.xxl,
  },
  overline: {
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 2.4,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
});
