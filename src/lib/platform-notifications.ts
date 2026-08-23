import { supabase } from "@/integrations/supabase/client";

const WORKER_URL = "/sw.js";

function getVapidPublicKey() {
  return import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY || process.env.VITE_WEB_PUSH_PUBLIC_KEY || "";
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = globalThis.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; ++index) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
}

export async function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register(WORKER_URL);
}

export async function requestBrowserNotificationPermission() {
  await registerAppServiceWorker();
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("Browser notifications are not supported in this environment.");
  }
  return Notification.requestPermission();
}

export async function showBrowserNotification(
  title: string,
  options: { body?: string; url?: string; kind?: string } = {},
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const registration =
    "serviceWorker" in navigator
      ? await navigator.serviceWorker.ready.catch(() => undefined)
      : undefined;
  const notificationOptions = {
    body: options.body,
    data: { url: options.url ?? "/dashboard", kind: options.kind ?? "info" },
  };

  if (registration?.showNotification) {
    await registration.showNotification(title, notificationOptions);
    return;
  }

  new Notification(title, notificationOptions);
}

export async function subscribeBrowserPush(userId: string) {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    throw new Error(
      "Missing VITE_WEB_PUSH_PUBLIC_KEY. Configure the push public key to enable device registration.",
    );
  }

  await registerAppServiceWorker();
  const permission = await requestBrowserNotificationPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const keys = subscription.toJSON().keys;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: keys?.p256dh ?? "",
      auth_secret: keys?.auth ?? "",
      device_name: globalThis.navigator?.userAgent ?? globalThis.navigator?.platform ?? "browser",
      platform: globalThis.navigator?.platform ?? "web",
      enabled: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) throw new Error(error.message);
  return subscription;
}

export async function unsubscribeBrowserPush(userId: string) {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return;
  }

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  const subscription = await registration?.pushManager.getSubscription().catch(() => null);
  const endpoint = subscription?.endpoint;

  if (subscription) {
    await subscription.unsubscribe().catch(() => undefined);
  }

  if (endpoint) {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);
    if (error) throw new Error(error.message);
  }
}

export async function getBrowserPushSubscription() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  return registration?.pushManager.getSubscription().catch(() => null) ?? null;
}
