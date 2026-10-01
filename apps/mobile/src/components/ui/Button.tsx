import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius } from "@/theme/tokens";
import { Text } from "./Text";

type Variant = "brass" | "primary" | "outline" | "inkOutline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  /** Required when `title` is empty (icon-only buttons); defaults to the title. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  haptic?: boolean;
}

const HEIGHT: Record<Size, number> = { sm: 36, md: 46, lg: 54 };
const FONT: Record<Size, number> = { sm: 13, md: 15, lg: 16 };

export function Button({
  title,
  onPress,
  variant = "brass",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  haptic = true,
}: ButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    brass: { bg: colors.brass, fg: colors.brassForeground, border: colors.brass },
    primary: { bg: colors.primary, fg: colors.primaryForeground, border: colors.primary },
    outline: { bg: "transparent", fg: colors.foreground, border: colors.border },
    // For the ink hero, where the regular outline's dark text disappears into the navy.
    inkOutline: {
      bg: "transparent",
      fg: colors.inkForeground,
      border: "rgba(255,255,255,0.3)",
    },
    ghost: { bg: "transparent", fg: colors.foreground, border: "transparent" },
    destructive: {
      bg: colors.destructive,
      fg: colors.destructiveForeground,
      border: colors.destructive,
    },
  };
  const tone = palette[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: size === "sm" ? 14 : 20,
          backgroundColor: tone.bg,
          borderColor: tone.border,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !inactive ? 0.985 : 1 }],
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          {title ? (
            <Text
              style={{ color: tone.fg, fontFamily: fonts.sansSemiBold, fontSize: FONT[size] }}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
          {iconRight}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: { alignSelf: "stretch" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
