import type { ReactNode } from "react";

// Desktop counterpart of BiometricGate.tsx. App lock is Face ID / fingerprint, which the desktop
// app doesn't have — the computer's own account lock does that job — so Settings hides the switch
// (appLockAvailable) and the gate lets everything through. Keep the exports in step.

export const appLockAvailable = false;

export async function isAppLockEnabled(): Promise<boolean> {
  return false;
}

export async function setAppLockEnabled(_enabled: boolean): Promise<boolean> {
  return false;
}

export function BiometricGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
