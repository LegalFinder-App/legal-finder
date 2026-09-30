import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, typeScale } from "@/theme/tokens";

type Variant =
  "display" | "h1" | "h2" | "h3" | "body" | "bodyStrong" | "small" | "caption" | "eyebrow" | "mono";

type Tone = "default" | "muted" | "brass" | "destructive" | "success" | "inverse" | "inkForeground";

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  align?: TextStyle["textAlign"];
}

const VARIANT_STYLE: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, ...typeScale.display, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.display, ...typeScale.h1, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.display, ...typeScale.h2, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.display, ...typeScale.h3, letterSpacing: -0.2 },
  body: { fontFamily: fonts.sans, ...typeScale.body },
  bodyStrong: { fontFamily: fonts.sansSemiBold, ...typeScale.body },
  small: { fontFamily: fonts.sans, ...typeScale.small },
  caption: { fontFamily: fonts.sans, ...typeScale.caption },
  // Web `.eyebrow`: mono, 11px, wide tracking, uppercase.
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16 },
};

export function Text({ variant = "body", tone = "default", align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const color = {
    default: colors.foreground,
    muted: colors.mutedForeground,
    brass: colors.brass,
    destructive: colors.destructive,
    success: colors.success,
    inverse: colors.background,
    inkForeground: colors.inkForeground,
  }[tone];

  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      style={[VARIANT_STYLE[variant], { color, textAlign: align }, style]}
      {...rest}
    />
  );
}
