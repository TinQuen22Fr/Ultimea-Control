// Static definitions for the remote control surface.
// Mirrors the physical Ultimea Aura A30 / A40 remote 1:1.
// Each "control" is a bindable slot that can be mapped to a discovered BLE command.

export type ControlCategory =
  | "power"
  | "volume"
  | "mute"
  | "sound_mode"
  | "source"
  | "eq"
  | "playback"
  | "system";

export type ControlDef = {
  key: string;
  label: string;
  category: ControlCategory;
};

// Sound modes printed on the physical remote.
export const SOUND_MODES = [
  { key: "movie", label: "Movie", sub: "Cinéma", control: "mode_movie" },
  { key: "music", label: "Music", sub: "Musique", control: "mode_music" },
  { key: "voice", label: "Voice", sub: "Voix", control: "mode_voice" },
  { key: "sport", label: "Sport", sub: "Sport", control: "mode_sport" },
  { key: "game", label: "Game", sub: "Jeu", control: "mode_game" },
  { key: "night", label: "Night", sub: "Nuit", control: "mode_night" },
] as const;

// Direct source buttons on the remote (plus the SOURCE cycle button handled separately).
export const SOURCES = [
  { key: "opt", label: "Optique", sub: "OPT / Toslink", control: "source_opt" },
  { key: "aux", label: "AUX", sub: "Jack 3.5", control: "source_aux" },
  { key: "bt", label: "Bluetooth", sub: "BT", control: "source_bt" },
  { key: "usb", label: "USB", sub: "USB", control: "source_usb" },
] as const;

// Stepper-style controls (− label +) present on the remote.
export const AUDIO_STEPPERS = [
  { key: "bass", label: "Basses", sub: "Bass MX", down: "bass_down", up: "bass_up" },
  { key: "midrange", label: "Médiums", sub: "Midrange", down: "mid_down", up: "mid_up" },
  { key: "treble", label: "Aigus", sub: "Treble", down: "treble_down", up: "treble_up" },
  { key: "surround", label: "Surround", sub: "Spatial", down: "surround_down", up: "surround_up" },
  { key: "prompt", label: "Prompt Tone", sub: "Bips", down: "prompt_down", up: "prompt_up" },
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
    title: "Lecture",
    controls: [
      { key: "play_pause", label: "Lecture / Pause", category: "playback" },
      { key: "prev", label: "Précédent", category: "playback" },
      { key: "next", label: "Suivant", category: "playback" },
      { key: "usb_repeat", label: "USB Repeat", category: "playback" },
    ],
  },
  {
    title: "Sources",
    controls: [
      { key: "source_cycle", label: "Source (cycle)", category: "source" },
      { key: "source_opt", label: "Optique (OPT)", category: "source" },
      { key: "source_aux", label: "AUX (Jack 3.5)", category: "source" },
      { key: "source_bt", label: "Bluetooth (BT)", category: "source" },
      { key: "source_usb", label: "USB", category: "source" },
    ],
  },
  {
    title: "Modes son",
    controls: [
      { key: "mode_movie", label: "Movie", category: "sound_mode" },
      { key: "mode_music", label: "Music", category: "sound_mode" },
      { key: "mode_voice", label: "Voice", category: "sound_mode" },
      { key: "mode_sport", label: "Sport", category: "sound_mode" },
      { key: "mode_game", label: "Game", category: "sound_mode" },
      { key: "mode_night", label: "Night", category: "sound_mode" },
    ],
  },
  {
    title: "Réglages audio",
    controls: [
      { key: "bass_up", label: "Basses +", category: "eq" },
      { key: "bass_down", label: "Basses −", category: "eq" },
      { key: "mid_up", label: "Médiums +", category: "eq" },
      { key: "mid_down", label: "Médiums −", category: "eq" },
      { key: "treble_up", label: "Aigus +", category: "eq" },
      { key: "treble_down", label: "Aigus −", category: "eq" },
      { key: "surround_up", label: "Surround +", category: "eq" },
      { key: "surround_down", label: "Surround −", category: "eq" },
      { key: "prompt_up", label: "Prompt Tone +", category: "eq" },
      { key: "prompt_down", label: "Prompt Tone −", category: "eq" },
    ],
  },
  {
    title: "Système",
    controls: [
      { key: "led_dimmer", label: "LED Dimmer", category: "system" },
      { key: "eq_reset", label: "EQ Reset", category: "system" },
      { key: "device_reset", label: "Device Reset", category: "system" },
    ],
  },
];

export const ALL_CONTROLS: ControlDef[] = CONTROL_GROUPS.flatMap((g) => g.controls);

export function controlLabel(key: string): string {
  return ALL_CONTROLS.find((c) => c.key === key)?.label ?? key;
}

// The soundbar we target. Used to highlight matching devices during scan.
export const TARGET_DEVICE_HINTS = ["aura", "ultimea", "a40", "a30"];

export const COMMAND_CATEGORIES = [
  { key: "volume", label: "Volume" },
  { key: "mute", label: "Muet" },
  { key: "power", label: "Alimentation" },
  { key: "source", label: "Source" },
  { key: "sound_mode", label: "Mode son" },
  { key: "eq", label: "Égaliseur" },
  { key: "playback", label: "Lecture" },
  { key: "system", label: "Système" },
  { key: "custom", label: "Autre" },
] as const;
