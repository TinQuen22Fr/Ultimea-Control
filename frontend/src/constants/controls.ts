// Static definitions for the remote control surface.
// Each "control" is a bindable slot that can be mapped to a discovered BLE command.

export type ControlCategory =
  | "power"
  | "volume"
  | "mute"
  | "sound_mode"
  | "source"
  | "eq";

export type ControlDef = {
  key: string;
  label: string;
  category: ControlCategory;
};

export const SOUND_MODES = [
  { key: "atmos", label: "Dolby Atmos", sub: "Virtuel", control: "mode_atmos" },
  { key: "surround", label: "7.1 Surround", sub: "Physique", control: "mode_surround" },
  { key: "movie", label: "Cinéma", sub: "Movie", control: "mode_movie" },
  { key: "music", label: "Musique", sub: "Music", control: "mode_music" },
  { key: "stereo", label: "Stéréo", sub: "2.0", control: "mode_stereo" },
  { key: "night", label: "Nuit", sub: "Night", control: "mode_night" },
] as const;

export const SOURCES = [
  { key: "optical", label: "Optique", sub: "Toslink", control: "source_optical" },
  { key: "bluetooth", label: "Bluetooth", sub: "BT", control: "source_bluetooth" },
  { key: "aux", label: "AUX", sub: "Jack 3.5", control: "source_aux" },
] as const;

// Full list of bindable controls, grouped for the Library binding screen.
export const CONTROL_GROUPS: { title: string; controls: ControlDef[] }[] = [
  {
    title: "Alimentation & Volume",
    controls: [
      { key: "power", label: "Marche / Arrêt", category: "power" },
      { key: "volume_up", label: "Volume +", category: "volume" },
      { key: "volume_down", label: "Volume −", category: "volume" },
      { key: "mute", label: "Muet", category: "mute" },
    ],
  },
  {
    title: "Modes son",
    controls: [
      { key: "mode_atmos", label: "Dolby Atmos (Virtuel)", category: "sound_mode" },
      { key: "mode_surround", label: "7.1 Surround", category: "sound_mode" },
      { key: "mode_movie", label: "Cinéma", category: "sound_mode" },
      { key: "mode_music", label: "Musique", category: "sound_mode" },
      { key: "mode_stereo", label: "Stéréo", category: "sound_mode" },
      { key: "mode_night", label: "Nuit", category: "sound_mode" },
    ],
  },
  {
    title: "Sources",
    controls: [
      { key: "source_optical", label: "Optique (Toslink)", category: "source" },
      { key: "source_bluetooth", label: "Bluetooth", category: "source" },
      { key: "source_aux", label: "AUX (Jack 3.5)", category: "source" },
    ],
  },
  {
    title: "Égaliseur",
    controls: [
      { key: "bass_up", label: "Basses +", category: "eq" },
      { key: "bass_down", label: "Basses −", category: "eq" },
      { key: "treble_up", label: "Aigus +", category: "eq" },
      { key: "treble_down", label: "Aigus −", category: "eq" },
    ],
  },
];

export const ALL_CONTROLS: ControlDef[] = CONTROL_GROUPS.flatMap((g) => g.controls);

export function controlLabel(key: string): string {
  return ALL_CONTROLS.find((c) => c.key === key)?.label ?? key;
}

// The soundbar we target. Used to highlight matching devices during scan.
export const TARGET_DEVICE_HINTS = ["aura", "ultimea", "a40"];

export const COMMAND_CATEGORIES = [
  { key: "volume", label: "Volume" },
  { key: "mute", label: "Muet" },
  { key: "power", label: "Alimentation" },
  { key: "source", label: "Source" },
  { key: "sound_mode", label: "Mode son" },
  { key: "eq", label: "Égaliseur" },
  { key: "custom", label: "Autre" },
] as const;
