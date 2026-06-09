import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import {
  Lightbulb,
  Minus,
  Pause,
  Play,
  Plus,
  Power,
  RefreshCw,
  Repeat,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  TriangleAlert,
  Volume2,
  VolumeX,
} from "lucide-react-native";

import { ControlButton } from "@/src/components/ControlButton";
import { ScreenHeader } from "@/src/components/ScreenHeader";
import { SelectCard } from "@/src/components/SelectCard";
import { StepperRow } from "@/src/components/StepperRow";
import { VolumeDial } from "@/src/components/VolumeDial";
import { useBle } from "@/src/ble/BleContext";
import { useController } from "@/src/hooks/useController";
import { AUDIO_STEPPERS, SOUND_MODES, SOURCES } from "@/src/constants/controls";
import { storage } from "@/src/utils/storage";
import { colors, fonts, radius, spacing } from "@/src/theme/colors";

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export default function RemoteScreen() {
  const { bleAvailable } = useBle();
  const { reload, sendControl, sendVolumeAbsolute, isBound } = useController();

  const [volume, setVolume] = useState(30);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeMode, setActiveMode] = useState<string>("movie");
  const [activeSource, setActiveSource] = useState<string>("bt");

  useEffect(() => {
    (async () => {
      setVolume((await storage.getItem("ac_volume", 30)) ?? 30);
      setMuted((await storage.getItem("ac_muted", false)) ?? false);
      setActiveMode((await storage.getItem("ac_mode", "movie")) ?? "movie");
      setActiveSource((await storage.getItem("ac_source", "bt")) ?? "bt");
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const volTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueVolume = useCallback(
    (v: number) => {
      if (volTimer.current) clearTimeout(volTimer.current);
      volTimer.current = setTimeout(() => {
        sendVolumeAbsolute(v);
      }, 180);
    },
    [sendVolumeAbsolute],
  );

  const onVolumeChange = (v: number) => {
    setVolume(v);
    storage.setItem("ac_volume", v);
    queueVolume(v);
  };

  const onVolUp = () => {
    if (muted) {
      setMuted(false);
      storage.setItem("ac_muted", false);
    }
    onVolumeChange(clamp(volume + 2));
  };

  const onVolDown = () => {
    onVolumeChange(clamp(volume - 2));
  };

  const onMute = () => {
    const next = !muted;
    setMuted(next);
    storage.setItem("ac_muted", next);
    sendControl("mute");
  };

  const onPlayPause = () => {
    setPlaying((p) => !p);
    sendControl("play_pause");
  };

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* Top utility row: Power / LED Dimmer / Mute */}
        <View style={styles.utilityRow}>
          <ControlButton
            icon={<Power size={24} color={colors.textPrimary} strokeWidth={1.8} />}
            label="Marche / Arrêt"
            onPress={() => sendControl("power")}
            bound={isBound("power")}
            testID="power-btn"
          />
          <ControlButton
            icon={<Lightbulb size={22} color={colors.textPrimary} strokeWidth={1.8} />}
            label="LED Dimmer"
            onPress={() => sendControl("led_dimmer")}
            bound={isBound("led_dimmer")}
            testID="led-dimmer-btn"
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

        {/* Volume dial */}
        <View style={styles.dialRow}>
          <ControlButton
            icon={<Minus size={22} color={colors.textPrimary} strokeWidth={2.2} />}
            onPress={onVolDown}
            size={56}
            bound
            testID="volume-down-btn"
          />
          <VolumeDial value={volume} muted={muted} onChange={onVolumeChange} size={224} />
          <ControlButton
            icon={<Plus size={22} color={colors.textPrimary} strokeWidth={2.2} />}
            onPress={onVolUp}
            size={56}
            bound
            testID="volume-up-btn"
          />
        </View>

        {/* Playback row */}
        <View style={styles.playbackRow}>
          <ControlButton
            icon={<SkipBack size={20} color={colors.textPrimary} strokeWidth={1.8} />}
            label="Précédent"
            onPress={() => sendControl("prev")}
            size={56}
            bound={isBound("prev")}
            testID="prev-btn"
          />
          <ControlButton
            icon={
              playing ? (
                <Pause size={24} color={colors.textPrimary} strokeWidth={1.8} />
              ) : (
                <Play size={24} color={colors.textPrimary} strokeWidth={1.8} />
              )
            }
            label="Lecture / Pause"
            onPress={onPlayPause}
            active={playing}
            size={64}
            bound={isBound("play_pause")}
            testID="play-pause-btn"
          />
          <ControlButton
            icon={<SkipForward size={20} color={colors.textPrimary} strokeWidth={1.8} />}
            label="Suivant"
            onPress={() => sendControl("next")}
            size={56}
            bound={isBound("next")}
            testID="next-btn"
          />
        </View>

        {/* Sources */}
        <View style={styles.sectionHead}>
          <Text style={styles.overline}>SOURCE D&apos;ENTRÉE</Text>
          <Pressable
            testID="source-cycle-btn"
            onPress={() => sendControl("source_cycle")}
            style={({ pressed }) => [
              styles.tinyPill,
              !isBound("source_cycle") && styles.tinyPillUnbound,
              pressed && styles.pressed,
            ]}
          >
            <Shuffle size={13} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.tinyPillText}>Source</Text>
          </Pressable>
        </View>
        <View style={styles.grid}>
          {SOURCES.map((s) => (
            <SelectCard
              key={s.key}
              label={s.label}
              sub={s.sub}
              selected={activeSource === s.key}
              bound={isBound(s.control)}
              onPress={() => selectSource(s.key, s.control, s.label)}
              flexBasis="47%"
              testID={`source-${s.key}-card`}
            />
          ))}
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
              flexBasis="30%"
              testID={`mode-${m.key}-card`}
            />
          ))}
        </View>

        {/* Audio steppers */}
        <Text style={styles.overline}>RÉGLAGES AUDIO</Text>
        {AUDIO_STEPPERS.map((st) => (
          <StepperRow
            key={st.key}
            label={st.label}
            sub={st.sub}
            onDown={() => sendControl(st.down)}
            onUp={() => sendControl(st.up)}
            boundDown={isBound(st.down)}
            boundUp={isBound(st.up)}
            testIDBase={st.key}
          />
        ))}

        {/* System */}
        <Text style={[styles.overline, styles.mt]}>SYSTÈME</Text>
        <View style={styles.systemRow}>
          <SystemPill
            icon={<Repeat size={15} color={colors.textPrimary} strokeWidth={2} />}
            label="USB Repeat"
            onPress={() => sendControl("usb_repeat")}
            bound={isBound("usb_repeat")}
            testID="usb-repeat-btn"
          />
          <SystemPill
            icon={<RotateCcw size={15} color={colors.textPrimary} strokeWidth={2} />}
            label="EQ Reset"
            onPress={() => sendControl("eq_reset")}
            bound={isBound("eq_reset")}
            testID="eq-reset-btn"
          />
          <SystemPill
            icon={<RefreshCw size={15} color={colors.disconnected} strokeWidth={2} />}
            label="Device Reset"
            onPress={() => sendControl("device_reset")}
            bound={isBound("device_reset")}
            danger
            testID="device-reset-btn"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SystemPill({
  icon,
  label,
  onPress,
  bound,
  danger,
  testID,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  bound?: boolean;
  danger?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.systemPill,
        !bound && styles.systemPillUnbound,
        danger && styles.systemPillDanger,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text style={[styles.systemPillText, danger && styles.systemPillTextDanger]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120 },
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
  demoText: { flex: 1, color: colors.warning, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  utilityRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  dialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  playbackRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overline: {
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 2.4,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  mt: { marginTop: spacing.lg },
  tinyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  tinyPillUnbound: { borderStyle: "dashed" },
  tinyPillText: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  systemRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  systemPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  systemPillUnbound: { borderStyle: "dashed" },
  systemPillDanger: { borderColor: "rgba(239,68,68,0.4)" },
  systemPillText: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 13 },
  systemPillTextDanger: { color: colors.disconnected },
  pressed: { opacity: 0.85 },
});
