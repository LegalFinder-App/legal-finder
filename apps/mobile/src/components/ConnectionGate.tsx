import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import NetInfo from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, Text } from "@/components/ui";
import { bridgedFetch } from "@/lib/bridged-fetch";
import { clerkFrontendApiHost } from "@/lib/env";

// Clerk loads once, at launch. If that first request fails (no data, a weak signal, or a phone
// clock far enough off to fail the TLS check) it gives up for good: `isLoaded` never turns true,
// so the app sat on its splash screen until it was force-closed, even after the connection came
// back. Its provider can't be made to try again (it keeps one shared instance). So the app first
// checks that Clerk's API answers, mounts Clerk only then, and otherwise says what's wrong and
// keeps trying.

const CHECK_TIMEOUT_MS = 15_000;
const RETRY_EVERY_MS = 30_000;

async function clerkReachable(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      bridgedFetch(`https://${clerkFrontendApiHost()}/v1/environment?_is_native=1`),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timed out")), CHECK_TIMEOUT_MS);
      }),
    ]);
    // Any answer short of a server error means Clerk can be reached, so it will load.
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function ConnectionGate({
  fontsLoaded,
  children,
}: {
  fontsLoaded: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState<"checking" | "offline" | "online">("checking");
  const [checking, setChecking] = useState(false);
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setChecking(true);
    const ok = await clerkReachable();
    busy.current = false;
    setChecking(false);
    // Once Clerk is mounted it stays mounted.
    setState((previous) => (previous === "online" || ok ? "online" : "offline"));
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  // While offline, try again when the connection comes back, and every so often meanwhile: Wi-Fi
  // without internet, or a clock that has just been corrected, doesn't announce itself.
  useEffect(() => {
    if (state !== "offline") return;
    let connected: boolean | null = null;
    const unsubscribe = NetInfo.addEventListener((net) => {
      if (connected === false && net.isConnected) void check();
      connected = Boolean(net.isConnected);
    });
    const timer = setInterval(() => void check(), RETRY_EVERY_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [state, check]);

  const showProblem = state === "offline" && fontsLoaded;
  useEffect(() => {
    if (showProblem) void SplashScreen.hideAsync();
  }, [showProblem]);

  if (state === "online") return <>{children}</>;
  // Still checking: the splash screen stays up.
  if (!showProblem) return null;
  return <ConnectionProblem checking={checking} onRetry={() => void check()} />;
}

function ConnectionProblem({ checking, onRetry }: { checking: boolean; onRetry: () => void }) {
  const { colors, scheme } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <View style={[styles.icon, { backgroundColor: colors.accent }]}>
        <WifiOff size={28} color={colors.brass} />
      </View>
      <Text variant="h2" style={styles.center}>
        Can’t connect
      </Text>
      <Text tone="muted" style={styles.center}>
        LegalFinder needs the internet to open. Check that you’re connected, and that your phone’s
        date and time are set automatically.
      </Text>
      <Text variant="small" tone="muted" style={styles.center}>
        It keeps trying, and opens as soon as the connection is back.
      </Text>
      <Button
        title={checking ? "Checking…" : "Try again"}
        loading={checking}
        onPress={onRetry}
        style={{ marginTop: 8, minWidth: 180 }}
      />
    </View>
  );
}

/** Clerk was reachable a moment ago but still hasn't loaded, and can't be made to try again. */
export function StillConnecting() {
  const { colors, scheme } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <View style={[styles.icon, { backgroundColor: colors.accent }]}>
        <WifiOff size={28} color={colors.brass} />
      </View>
      <Text variant="h2" style={styles.center}>
        Still connecting…
      </Text>
      <Text tone="muted" style={styles.center}>
        This is taking longer than usual. If nothing changes, close LegalFinder and open it again.
      </Text>
      {/* A desktop window can reload itself; a phone app can't. */}
      {Platform.OS === "web" ? (
        <Button
          title="Reload"
          onPress={() => globalThis.location?.reload()}
          style={{ marginTop: 8, minWidth: 180 }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  center: { textAlign: "center", maxWidth: 340 },
});
