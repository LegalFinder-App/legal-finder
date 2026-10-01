import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { gradients } from "@/theme/tokens";
import { Text } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { ScreenStatusBar } from "@/components/ScreenStatusBar";

/** Ink hero band with the logo, then the form on paper — the web auth page's two-panel look. */
export function AuthScaffold({
  title,
  subtitle,
  children,
  dismissible = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  dismissible?: boolean;
}) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenStatusBar style="light" />
      <LinearGradient
        colors={[...(scheme === "dark" ? gradients.inkDark : gradients.inkLight)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.heroTop}>
          <Logo onInk />
          {dismissible && router.canGoBack() ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              onPress={() => router.back()}
              style={styles.close}
            >
              <X size={20} color={colors.inkForeground} />
            </Pressable>
          ) : null}
        </View>
        <Text variant="small" tone="inkForeground" style={{ opacity: 0.7, marginTop: 14 }}>
          The justice system, organised around the person who needs it.
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <Text variant="display" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text tone="muted" style={{ marginTop: 6 }}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.form}>{children}</View>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 28 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  body: { paddingHorizontal: 24, paddingTop: 28 },
  form: { marginTop: 24, gap: 16 },
});
