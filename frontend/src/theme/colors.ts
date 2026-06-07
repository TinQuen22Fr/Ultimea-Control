// AuraControl design tokens — premium dark audio-gear aesthetic.
// Source: /app/design_guidelines.json

export const colors = {
  bg: "#0A0A0C",
  bgTerminal: "#050505",
  surface: "#121215",
  surfaceElevated: "#1C1C21",
  surfacePressed: "#25252C",
  borderSubtle: "#1F1F24",
  borderStrong: "#33333C",
  white: "#FFFFFF",
  textPrimary: "#FFFFFF",
  textSecondary: "#8E8E98",
  textTertiary: "#55555C",
  terminalLog: "#A3E635",
  terminalUuid: "#71717A",
  connected: "#10B981",
  disconnected: "#EF4444",
  warning: "#F59E0B",
  accent: "#FFFFFF",
} as const;

export const fonts = {
  light: "Manrope_300Light",
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  mono: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
} as const;
