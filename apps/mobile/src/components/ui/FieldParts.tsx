import type { ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius } from "@/theme/tokens";
import { Text } from "./Text";

// Shared by the field components in Fields.tsx and both DateTimeField variants.

export function FieldLabel({ label }: { label: string }) {
  return (
    <Text variant="small" style={{ fontFamily: fonts.sansMedium, marginBottom: 6 }}>
      {label}
    </Text>
  );
}

export function FieldBox({
  onPress,
  children,
  accessibilityLabel,
}: {
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.box, { borderColor: colors.input, backgroundColor: colors.card }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.lg,
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
