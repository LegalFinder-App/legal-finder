import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { palette } from "@/theme/tokens";

/**
 * Last-resort fallback for a render error anywhere in the app — exported as the root layout's
 * `ErrorBoundary`. Without it a release build simply closes. It replaces the whole root layout
 * (theme, Clerk and query providers included), so it only uses plain React Native, system fonts
 * and raw palette tokens.
 */
export function RootErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = palette[useColorScheme() === "dark" ? "dark" : "light"];

  useEffect(() => {
    console.error("[app] unhandled render error", error);
    // The error may have struck before the first screen hid the splash screen.
    void SplashScreen.hideAsync();
  }, [error]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.body}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
            Something went wrong
          </Text>
          <Text style={[styles.copy, { color: colors.mutedForeground }]}>
            LegalFinder hit an unexpected problem. Try again — if it keeps happening, close and
            reopen the app.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void retry()}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.brass, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.brassForeground }]}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center" },
  body: { paddingHorizontal: 28, gap: 14 },
  title: { fontSize: 26, fontWeight: "700" },
  copy: { fontSize: 16, lineHeight: 23 },
  button: {
    marginTop: 10,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
});
