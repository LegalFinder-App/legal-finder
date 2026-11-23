import { Pressable, StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

interface CardProps extends ViewProps {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
}

/** The web's bordered plate card: cool ink surface, soft shadow, 16px radius. */
export function Card({
  children,
  onPress,
  padded = true,
  style,
  accessibilityLabel,
  ...rest
}: CardProps) {
  const { colors, scheme } = useTheme();
  const base = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      shadowOpacity: scheme === "dark" ? 0.35 : 0.08,
    },
    padded && styles.padded,
    style,
  ];

  if (!onPress) {
    return (
      <View style={base} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#0a152a",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 2,
  },
  padded: { padding: 16 },
});
