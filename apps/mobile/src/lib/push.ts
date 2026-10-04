import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useAuth } from "./auth";
import { router } from "expo-router";
import * as SecureStore from "./secure-store";
import { api } from "./api";

const TOKEN_KEY = "lf.push-token";
// Set when the user switches push off in Settings. The OS permission stays granted after that, so
// without this flag the next launch would quietly re-register the device.
const OPT_OUT_KEY = "lf.push-opt-out";

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

/**
 * False on simulators and in builds where push isn't wired up yet (see README), so screens hide
 * their push controls instead of offering a switch that can't work.
 */
export function pushAvailable(): boolean {
  if (!Device.isDevice || !projectId()) return false;
  // The project id alone isn't enough: every build has one (EAS Build needs it), while push also
  // needs the server's token table and the store credentials. PUSH_ENABLED in app.config.ts is
  // switched on once those exist.
  if (Constants.expoConfig?.extra?.pushEnabled !== true) return false;
  // Android delivers through Firebase, which only exists in builds made with google-services.json.
  return Platform.OS !== "android" || Boolean(Constants.expoConfig?.android?.googleServicesFile);
}

/** "off" = permission not granted yet; "opted-out" = switched off in Settings (don't nag). */
export type PushStatus = "unavailable" | "on" | "off" | "opted-out";

export async function pushStatus(): Promise<PushStatus> {
  if (!pushAvailable()) return "unavailable";
  if (await SecureStore.getItemAsync(OPT_OUT_KEY)) return "opted-out";
  return (await Notifications.getPermissionsAsync()).granted ? "on" : "off";
}

async function registerDevice(): Promise<boolean> {
  const token = await currentToken();
  if (!token) return false;
  await api.registerPushToken(token, Platform.OS, Device.deviceName ?? null);
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return true;
}

/** Asks for permission (from an explicit user action) and registers this device. */
export async function enablePushNotifications(): Promise<"granted" | "denied" | "unavailable"> {
  if (!pushAvailable()) return "unavailable";
  const existing = await Notifications.getPermissionsAsync();
  const status = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!status.granted) return "denied";
  if (!(await registerDevice())) return "unavailable";
  await SecureStore.deleteItemAsync(OPT_OUT_KEY);
  return "granted";
}

/** Sign-out: stop this account's pushes reaching the device, without changing the preference. */
export async function unregisterPushDevice() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return;
  await api.unregisterPushToken(token).catch(() => undefined);
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** The Settings switch: unregister and remember the choice across launches and sign-ins. */
export async function disablePushNotifications() {
  await SecureStore.setItemAsync(OPT_OUT_KEY, "1");
  await unregisterPushDevice();
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
  if (path === "/admin/reports") return "/?tab=reports";
  if (path === "/admin" || path.startsWith("/admin/")) return "/";
  return path;
}

/**
 * Re-registers the token on sign-in when push is on for this device (tokens can rotate), and
 * routes notification taps to the matching screen.
 */
export function usePushRegistration() {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      if ((await pushStatus()) === "on") await registerDevice();
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
