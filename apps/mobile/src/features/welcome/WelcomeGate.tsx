import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AnimatedSplash } from "./AnimatedSplash";
import { Onboarding } from "./Onboarding";
import { hasCompletedOnboarding, markOnboardingComplete } from "@/lib/welcome-storage";
import { useTheme } from "@/theme/ThemeProvider";

type Phase = "boot" | "splash" | "onboarding" | "ready";

/**
 * Cold launch: animated brand splash, then a one-time walkthrough for first-time users.
 * The app tree mounts under the splash so the first real screen is warm when it fades.
 */
export function WelcomeGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>("boot");
  const needsOnboarding = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void hasCompletedOnboarding().then((done) => {
      if (cancelled) return;
      needsOnboarding.current = !done;
      setPhase("splash");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSplashFinished = useCallback(() => {
    setPhase(needsOnboarding.current ? "onboarding" : "ready");
  }, []);

  const onOnboardingComplete = useCallback(() => {
    void markOnboardingComplete();
    needsOnboarding.current = false;
    setPhase("ready");
  }, []);

  if (phase === "boot") {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.ink }]} />;
  }

  if (phase === "onboarding") {
    // Full-bleed canvas so a capped onboarding column stays centred on wide desktop monitors.
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center" }]}>
        <Onboarding onComplete={onOnboardingComplete} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {children}
      {phase === "splash" ? <AnimatedSplash onFinished={onSplashFinished} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
