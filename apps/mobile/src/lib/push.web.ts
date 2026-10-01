// Desktop counterpart of push.ts. No push service is wired to the desktop app, so the push
// controls stay hidden (pushAvailable() is false); the in-app notifications list and live updates
// work the same as on phones. Keep the exports in step with push.ts.

export type PushStatus = "unavailable" | "on" | "off" | "opted-out";

export function pushAvailable(): boolean {
  return false;
}

export async function pushStatus(): Promise<PushStatus> {
  return "unavailable";
}

export async function enablePushNotifications(): Promise<"granted" | "denied" | "unavailable"> {
  return "unavailable";
}

export async function unregisterPushDevice(): Promise<void> {}

export async function disablePushNotifications(): Promise<void> {}

export function usePushRegistration(): void {}
