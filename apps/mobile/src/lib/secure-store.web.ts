import { desktop } from "./desktop";

// Desktop counterpart of expo-secure-store: the shell encrypts each value with the OS keychain
// (Electron safeStorage). In a plain browser tab — development only — there is no shell, so
// localStorage stands in. If storage fails altogether the value lives for this run only, which
// degrades to "sign in again next launch" rather than a crash.
const memory = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  try {
    if (desktop) return (await desktop.store.get(key)) ?? memory.get(key) ?? null;
    return globalThis.localStorage?.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  memory.set(key, value);
  try {
    if (desktop) await desktop.store.set(key, value);
    else globalThis.localStorage?.setItem(key, value);
  } catch {
    // kept in memory above
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  memory.delete(key);
  try {
    if (desktop) await desktop.store.remove(key);
    else globalThis.localStorage?.removeItem(key);
  } catch {
    // nothing to remove
  }
}
