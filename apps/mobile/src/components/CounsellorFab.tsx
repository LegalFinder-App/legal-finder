import { Pressable, StyleSheet, View } from "react-native";
import { router, usePathname, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/theme/ThemeProvider";
import { CounsellorMark } from "@/components/CounsellorMark";
import { useAuth } from "@/lib/auth";
import { useWideLayout } from "@/lib/layout";
import { appSettingsQuery } from "@/lib/queries";

/**
 * Bottom-right Counsellor AI launcher for phone, tablet, and the desktop shell export.
 * Cleared of the tab bar and home indicator; hidden on auth and the assistant screen.
 */
export function CounsellorFab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();
  const wide = useWideLayout();
  const { isLoaded, isSignedIn } = useAuth();
  const settings = useQuery(appSettingsQuery);

  const enabled = settings.data?.ai_assistant_enabled !== false;
  const inAuth = segments[0] === "(auth)";
  const onAssistant = pathname === "/assistant" || pathname.startsWith("/assistant/");
  const showTabBar = Boolean(isLoaded && isSignedIn) && !wide;

  if (!enabled || inAuth || onAssistant) return null;

  const bottom = (showTabBar ? 58 + Math.max(insets.bottom, 10) : Math.max(insets.bottom, 12)) + 14;

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Counsellor AI"
        onPress={() => router.push("/assistant")}
        style={({ pressed }) => [
          styles.fab,
          {
            right: Math.max(insets.right, 16),
            bottom,
            backgroundColor: colors.brass,
            borderColor: colors.brass,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.sheen, { backgroundColor: "rgba(255,255,255,0.22)" }]}
        />
        <CounsellorMark size={22} color={colors.brassForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sheen: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "48%",
  },
});
