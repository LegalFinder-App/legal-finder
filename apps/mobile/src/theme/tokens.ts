// Hex mirror of the web ink/brass system (`src/design/tokens.json`). React Native has no
// oklch(); keep this in step with `npm run tokens:export` on the website.

export const palette = {
  light: {
    background: "#f8fafc",
    foreground: "#111b2b",
    card: "#ffffff",
    primary: "#13213a",
    primaryForeground: "#f8fafd",
    secondary: "#eef1f6",
    secondaryForeground: "#13213a",
    muted: "#eef1f6",
    mutedForeground: "#59616d",
    accent: "#f7f0e0",
    accentForeground: "#5b3a13",
    destructive: "#c2272d",
    destructiveForeground: "#f8fafd",
    border: "#e0e4e9",
    input: "#d5dae0",
    brass: "#956809",
    brassForeground: "#fdfcf9",
    gold: "#dea645",
    ink: "#0a152a",
    inkForeground: "#f0f4f7",
    success: "#186b45",
    successForeground: "#f8fafd",
    warning: "#dd9231",
    warningForeground: "#4c2904",
    info: "#286cab",
    infoForeground: "#f8fafd",
    overlay: "rgba(10, 21, 42, 0.45)",
  },
  dark: {
    background: "#0a0f1b",
    foreground: "#eff2f5",
    card: "#121927",
    primary: "#ebeff4",
    primaryForeground: "#0c1628",
    secondary: "#1a2131",
    secondaryForeground: "#eff2f5",
    muted: "#1a2131",
    mutedForeground: "#9fa9b4",
    accent: "#37250d",
    accentForeground: "#f3e6ce",
    destructive: "#e55551",
    destructiveForeground: "#f8fafd",
    border: "#ffffff1a",
    input: "#ffffff26",
    brass: "#deaf5c",
    brassForeground: "#0b1423",
    gold: "#e9b452",
    ink: "#040711",
    inkForeground: "#eff2f5",
    success: "#54b581",
    successForeground: "#020f07",
    warning: "#eca851",
    warningForeground: "#221202",
    info: "#5b9bd4",
    infoForeground: "#f8fafd",
    overlay: "rgba(0, 0, 0, 0.6)",
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type Colors = { [K in keyof (typeof palette)["light"]]: string };

// Web --gradient-ink / --gradient-brass stops.
export const gradients = {
  inkLight: ["#0f1f37", "#0a152a", "#060f1e"],
  inkDark: ["#0e1b2d", "#040711", "#090e1f"],
  brass: ["#dea645", "#956809"],
} as const;

// Plus Jakarta Sans for UI + display (web); Fraunces italic is accent-only on web — kept for rare titles.
export const fonts = {
  display: "PlusJakartaSans_600SemiBold",
  displayBold: "PlusJakartaSans_700Bold",
  sans: "PlusJakartaSans_400Regular",
  sansMedium: "PlusJakartaSans_500Medium",
  sansSemiBold: "PlusJakartaSans_600SemiBold",
  sansBold: "PlusJakartaSans_700Bold",
  mono: "IBMPlexMono_500Medium",
  serifAccent: "Fraunces_600SemiBold",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24, "3xl": 32, "4xl": 40 };

// Web --radius: 0.75rem (12px) base.
export const radius = { sm: 8, md: 10, lg: 12, xl: 16, "2xl": 20, full: 999 };

export const typeScale = {
  display: { fontSize: 34, lineHeight: 40 },
  h1: { fontSize: 28, lineHeight: 34 },
  h2: { fontSize: 22, lineHeight: 28 },
  h3: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 11, lineHeight: 14 },
} as const;
