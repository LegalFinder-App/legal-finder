import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { Colors } from "@/theme/tokens";
import { fonts } from "@/theme/tokens";
import { Text } from "./Text";

export type StatusTone = "success" | "muted" | "warning" | "destructive" | "neutral";

// Mirrors STATUS_TONE in the web app's src/components/common/bits.tsx.
const STATUS_TONE: Record<string, StatusTone> = {
  open: "success",
  active: "success",
  confirmed: "success",
  verified: "success",
  apprehended: "success",
  wanted: "destructive",
  resolved: "muted",
  closed: "muted",
  completed: "muted",
  pending: "warning",
  submitted: "warning",
  investigating: "warning",
  hearing: "warning",
  expiring: "warning",
  urgent: "destructive",
  high: "destructive",
  cancelled: "destructive",
  failed: "destructive",
  expired: "destructive",
};

function toneColors(tone: StatusTone, colors: Colors, dark: boolean) {
  switch (tone) {
    case "success":
      return { bg: `${colors.success}26`, fg: colors.success };
    case "warning":
      // Light mode matches the web (dark-brown text on a pale amber wash); in dark mode that
      // brown would vanish on the dark wash, so use the amber itself as the text colour.
      return { bg: `${colors.warning}33`, fg: dark ? colors.warning : colors.warningForeground };
    case "destructive":
      return { bg: `${colors.destructive}26`, fg: colors.destructive };
    case "muted":
      return { bg: colors.muted, fg: colors.mutedForeground };
    default:
      return { bg: colors.secondary, fg: colors.secondaryForeground };
  }
}

/** `tone` overrides the default for a status word that means something else in context. */
export function StatusPill({ value, tone }: { value: string; tone?: StatusTone }) {
  const { colors, scheme } = useTheme();
  const { bg, fg } = toneColors(
    tone ?? STATUS_TONE[value.toLowerCase()] ?? "neutral",
    colors,
    scheme === "dark",
  );
  const label = value.replace(/_/g, " ");
  return (
    <View style={[styles.pill, { backgroundColor: bg }]} accessibilityLabel={`Status: ${label}`}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 11, textTransform: "capitalize" },
});
