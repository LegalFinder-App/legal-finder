import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import type { AnyRouter } from "@tanstack/react-router";

import type { ResolvedTheme } from "@/lib/theme";

/** True only inside the Capacitor-wrapped Android/iOS app, never in a plain browser tab. */
export const isNativePlatform = () => Capacitor.isNativePlatform();

// Matches --background in src/styles.css (light: warm archival paper, dark: ink navy).
const STATUS_BAR_BG = {
  light: "#fbfaf7",
  dark: "#1a2338",
} as const;

/** Keeps the native status bar's color/icon style in sync with the in-app light/dark theme. */
export function useNativeStatusBar(resolvedTheme: ResolvedTheme) {
  useEffect(() => {
    if (!isNativePlatform()) return;
    let cancelled = false;
    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        if (cancelled) return;
        await StatusBar.setStyle({ style: resolvedTheme === "dark" ? Style.Dark : Style.Light });
        // Android only — iOS ignores setBackgroundColor and rejects the call.
        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setBackgroundColor({ color: STATUS_BAR_BG[resolvedTheme] });
        }
      } catch {
        // Non-fatal: status bar theming is cosmetic.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedTheme]);
}

/** Hides the native splash screen once the themed app shell has actually painted. */
export function useHideNativeSplashScreen() {
  useEffect(() => {
    if (!isNativePlatform()) return;
    (async () => {
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        // Non-fatal.
      }
    })();
  }, []);
}

/**
 * Routes the Android hardware back button through the router's own history instead of the
 * default behavior (which exits the app from any screen with no confirmation). Falls back to
 * exiting the app only when there's nowhere left to go back to.
 */
export function useNativeBackButton(router: AnyRouter) {
  useEffect(() => {
    if (!isNativePlatform() || Capacitor.getPlatform() !== "android") return;
    let removeListener: (() => void) | undefined;
    (async () => {
      try {
        const { App: CapacitorApp } = await import("@capacitor/app");
        const handle = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack && router.history.canGoBack()) {
            router.history.back();
          } else {
            CapacitorApp.exitApp();
          }
        });
        removeListener = () => {
          handle.remove();
        };
      } catch {
        // Non-fatal.
      }
    })();
    return () => removeListener?.();
  }, [router]);
}

async function withHaptics(run: () => Promise<void>) {
  if (!isNativePlatform()) return;
  try {
    await run();
  } catch {
    // Non-fatal: haptics are a nice-to-have.
  }
}

/** No-ops on web; fires real haptic feedback inside the native app. */
export const haptics = {
  tap: () =>
    withHaptics(async () => {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Light });
    }),
  success: () =>
    withHaptics(async () => {
      const { Haptics, NotificationType } = await import("@capacitor/haptics");
      await Haptics.notification({ type: NotificationType.Success });
    }),
  error: () =>
    withHaptics(async () => {
      const { Haptics, NotificationType } = await import("@capacitor/haptics");
      await Haptics.notification({ type: NotificationType.Error });
    }),
};
