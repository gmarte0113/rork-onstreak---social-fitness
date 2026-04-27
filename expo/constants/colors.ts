export const Colors = {
  bg: "#0A0A0B",
  surface: "#141416",
  surfaceElevated: "#1C1C20",
  border: "#26262B",
  text: "#FFFFFF",
  textMuted: "#9A9AA3",
  textDim: "#5F5F68",
  primary: "#FF6B35",
  primaryDark: "#E8561F",
  accent: "#FFB627",
  success: "#22C55E",
  danger: "#EF4444",
  tint: "#FF6B35",
} as const;

export default {
  light: {
    text: Colors.text,
    background: Colors.bg,
    tint: Colors.tint,
    tabIconDefault: Colors.textDim,
    tabIconSelected: Colors.tint,
  },
};
