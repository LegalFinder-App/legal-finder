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
import { useWideLayout } from "@/lib/layout";

const TAGLINE = "The justice system, organised around the person who needs it.";

/**
 * The frame around every sign-in screen — the web auth page's ink-and-paper look. On a phone the
 * ink is a band across the top with the form below; on a wide desktop window it becomes a panel
 * beside the form.
 */
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
  const wide = useWideLayout();
  const ink = [...(scheme === "dark" ? gradients.inkDark : gradients.inkLight)] as const;
  const canClose = dismissible && router.canGoBack();

  const form = (
    <>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text tone="muted" style={{ marginTop: 6 }}>
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.form}>{children}</View>
    </>
  );

  if (wide) {
    return (
      <View style={[styles.wideRoot, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={ink}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.widePanel}
        >
          <Logo onInk size={24} />
          <View style={{ gap: 14 }}>
            <Text variant="display" tone="inkForeground">
              {TAGLINE}
            </Text>
            <Text tone="inkForeground" style={{ opacity: 0.7 }}>
              Verified advocates, case tracking, court judgements and police services — on one
              platform.
            </Text>
          </View>
          <Text variant="caption" tone="inkForeground" style={{ opacity: 0.55 }}>
            LegalFinder is an independent, privately operated platform and is not affiliated with
            the Government of Uganda, the Judiciary or the Uganda Police Force.
          </Text>
        </LinearGradient>

        <KeyboardAwareScrollView
          bottomOffset={24}
          style={styles.flex}
          contentContainerStyle={styles.widePane}
          keyboardShouldPersistTaps="handled"
        >
          {canClose ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              onPress={() => router.back()}
              style={[styles.close, styles.wideClose, { backgroundColor: colors.muted }]}
            >
              <X size={20} color={colors.foreground} />
            </Pressable>
          ) : null}
          <View style={styles.wideForm}>{form}</View>
        </KeyboardAwareScrollView>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenStatusBar style="light" />
      <LinearGradient
        colors={ink}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.heroTop}>
          <Logo onInk />
          {canClose ? (
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
          {TAGLINE}
        </Text>
      </LinearGradient>

      <View style={styles.body}>{form}</View>
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
  wideRoot: { flex: 1, flexDirection: "row" },
  widePanel: { flex: 1, maxWidth: 560, padding: 48, justifyContent: "space-between" },
  widePane: { flexGrow: 1, justifyContent: "center", padding: 48 },
  wideForm: { width: "100%", maxWidth: 440, alignSelf: "center" },
  wideClose: { position: "absolute", top: 24, right: 24 },
});
