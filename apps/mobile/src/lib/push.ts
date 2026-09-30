import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";

const TOKEN_KEY = "lf.push-token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "LegalFinder updates",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: "#bb8739",
  });
}

function projectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
    Constants.easConfig?.projectId
  );
}

async function currentToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators/emulators can't receive remote pushes
  const id = projectId();
  if (!id) return null; // needs an EAS project (eas init) — see apps/mobile/README.md
  await ensureAndroidChannel();
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  return data;
}

/** Asks for permission (from an explicit user action) and registers this device. */
export async function enablePushNotifications(): Promise<"granted" | "denied" | "unavailable"> {
  if (!Device.isDevice || !projectId()) return "unavailable";
  const existing = await Notifications.getPermissionsAsync();
  const status = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!status.granted) return "denied";
  const token = await currentToken();
  if (!token) return "unavailable";
  await api.registerPushToken(token, Platform.OS, Device.deviceName ?? null);
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return "granted";
}

export async function disablePushNotifications() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    await api.unregisterPushToken(token).catch(() => undefined);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export async function pushPermissionGranted(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Only turns a web URL/path from a notification into an in-app route — never an external site. */
function routeFromLink(link: unknown): string | null {
  if (typeof link !== "string" || !link) return null;
  let path = link;
  try {
    const url = new URL(link);
    if (!/(^|\.)legalfinder\.co$/.test(url.hostname)) return null;
    path = url.pathname;
  } catch {
    // already a path
  }
  if (!path.startsWith("/")) return null;
  if (path === "/dashboard" || path === "/practice" || path === "/precinct" || path === "/bench")
    return "/";
  return path;
}

/**
 * Re-registers the token on sign-in when permission was already granted (tokens can rotate), and
 * routes notification taps to the matching screen.
 */
export function usePushRegistration() {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      if (!(await pushPermissionGranted())) return;
      const token = await currentToken();
      if (!token) return;
      await api.registerPushToken(token, Platform.OS, Device.deviceName ?? null);
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    })().catch(() => undefined);
  }, [isSignedIn]);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const route = routeFromLink(response?.notification.request.content.data?.url);
      if (route) router.push(route as never);
    };
    void Notifications.getLastNotificationResponseAsync().then(open);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
