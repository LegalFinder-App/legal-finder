import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AppState, StyleSheet, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@clerk/expo";
import { Lock } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, Text } from "@/components/ui";

const LOCK_KEY = "lf.app-lock";
// Re-lock only after the app has been in the background this long, so quickly checking another
// app (e.g. copying an OTP) doesn't demand Face ID again.
const RELOCK_AFTER_MS = 60_000;

export async function isAppLockEnabled() {
  return (await SecureStore.getItemAsync(LOCK_KEY)) === "on";
}

export async function setAppLockEnabled(enabled: boolean): Promise<boolean> {
  if (enabled) {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirm to turn on app lock",
    });
    if (!result.success) return false;
    await SecureStore.setItemAsync(LOCK_KEY, "on");
  } else {
    await SecureStore.deleteItemAsync(LOCK_KEY);
  }
  return true;
}

/** Covers the app with a lock screen until Face ID / fingerprint succeeds, when app lock is on. */
export function BiometricGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const { isSignedIn } = useAuth();
  const [locked, setLocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock LegalFinder",
      fallbackLabel: "Use passcode",
    });
    if (result.success) setLocked(false);
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    void isAppLockEnabled().then((enabled) => {
      setLocked(enabled);
      if (enabled) void unlock();
    });
  }, [isSignedIn, unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "background") backgroundedAt.current = Date.now();
      if (state === "active" && backgroundedAt.current && isSignedIn) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (away > RELOCK_AFTER_MS && (await isAppLockEnabled())) {
          setLocked(true);
          void unlock();
        }
      }
    });
    return () => sub.remove();
  }, [isSignedIn, unlock]);

  return (
    <View style={styles.flex}>
      {children}
      {/* Signing out always drops the lock screen; derived here rather than reset in an effect. */}
      {locked && isSignedIn ? (
        <View style={[StyleSheet.absoluteFill, styles.lock, { backgroundColor: colors.ink }]}>
          <View style={[styles.badge, { backgroundColor: `${colors.brass}33` }]}>
            <Lock size={28} color={colors.brass} />
          </View>
          <Text variant="h2" tone="inkForeground" align="center">
            LegalFinder is locked
          </Text>
          <Text variant="small" tone="inkForeground" align="center" style={{ opacity: 0.7 }}>
            Your case files and messages stay private until you unlock.
          </Text>
          <Button
            title="Unlock"
            onPress={() => void unlock()}
            style={{ marginTop: 12, minWidth: 180 }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lock: { alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
});
