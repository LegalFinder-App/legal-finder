// Hex conversions of the web app's "Chambers" OKLCH tokens (src/styles.css) — React Native has no
// oklch() support, so these are precomputed rather than parsed at runtime. Keep them in step with
// the web stylesheet when the brand palette changes.

export const palette = {
  light: {
    background: "#fcfaf6",
    foreground: "#151e2d",
    card: "#ffffff",
    primary: "#13253f",
    primaryForeground: "#fbf8f2",
    secondary: "#f2efe9",
    secondaryForeground: "#13253f",
    muted: "#f1eee9",
    mutedForeground: "#606874",
    accent: "#f3ebde",
    accentForeground: "#492f10",
    destructive: "#bf242b",
    destructiveForeground: "#fbf8f2",
    border: "#e1ddd5",
    input: "#e1ddd5",
    brass: "#bb8739",
    brassForeground: "#101926",
    ink: "#0b182b",
    inkForeground: "#f4f1eb",
    success: "#267b51",
    successForeground: "#fbf8f2",
    warning: "#dd9231",
    warningForeground: "#2c1b08",
    overlay: "rgba(11, 24, 43, 0.45)",
  },
  dark: {
    background: "#070f1b",
    foreground: "#f1eee9",
    card: "#0f1929",
    primary: "#e2ded5",
    primaryForeground: "#0c1626",
    secondary: "#182436",
    secondaryForeground: "#f1eee9",
    muted: "#182436",
    mutedForeground: "#9ba2ad",
    accent: "#3a2710",
    accentForeground: "#f2e6d2",
    destructive: "#de4e4b",
    destructiveForeground: "#fbf8f2",
    border: "#ffffff1f",
    input: "#ffffff29",
    brass: "#ce9a4a",
    brassForeground: "#09121f",
    ink: "#040913",
    inkForeground: "#f1eee9",
    success: "#50a678",
    successForeground: "#020f07",
    warning: "#eca851",
    warningForeground: "#221202",
    overlay: "rgba(0, 0, 0, 0.6)",
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type Colors = { [K in keyof (typeof palette)["light"]]: string };

// Web --gradient-ink / --gradient-brass stops.
export const gradients = {
  inkLight: ["#0f1f37", "#060f1e", "#0d152a"],
  inkDark: ["#0e1b2d", "#040914", "#090e1f"],
  brass: ["#cda454", "#b6762a"],
} as const;

export const fonts = {
  display: "Fraunces_600SemiBold",
  displayBold: "Fraunces_700Bold",
  sans: "PublicSans_400Regular",
  sansMedium: "PublicSans_500Medium",
  sansSemiBold: "PublicSans_600SemiBold",
  sansBold: "PublicSans_700Bold",
  mono: "IBMPlexMono_500Medium",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24, "3xl": 32, "4xl": 40 };

// --radius is 0.5rem (8px) on the web; the scale below mirrors its sm/md/lg/xl steps.
export const radius = { sm: 4, md: 6, lg: 8, xl: 12, "2xl": 16, full: 999 };

export const typeScale = {
  display: { fontSize: 34, lineHeight: 40 },
  h1: { fontSize: 28, lineHeight: 34 },
  h2: { fontSize: 22, lineHeight: 28 },
  h3: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 11, lineHeight: 14 },
} as const;
