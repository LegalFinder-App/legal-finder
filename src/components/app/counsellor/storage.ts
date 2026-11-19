import type { ResearchFilters } from "@/lib/assistant-sources";
import type { Conversation } from "./types";

const PREFIX = "legalfinder.counsellor.v1";
const RESEARCH_PREFIX = "legalfinder.counsellor.research.v1";
const KEY_PREFIX = "legalfinder.counsellor.key.v1";
const ENC_PREFIX = "enc:v1:";

export type ResearchHistoryEntry = {
  id: string;
  query: string;
  filters: ResearchFilters;
  resultCount: number;
  at: string;
};

function keyFor(userId: string) {
  return `${PREFIX}:${userId}`;
}

function researchKeyFor(userId: string) {
  return `${RESEARCH_PREFIX}:${userId}`;
}

function deviceKeyStorageKey(userId: string) {
  return `${KEY_PREFIX}:${userId}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function getOrCreateDeviceKey(userId: string): Promise<CryptoKey | null> {
  if (typeof window === "undefined" || !window.crypto?.subtle) return null;
  try {
    const storageKey = deviceKeyStorageKey(userId);
    let raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      const generated = window.crypto.getRandomValues(new Uint8Array(32));
      raw = bytesToBase64(generated);
      window.localStorage.setItem(storageKey, raw);
    }
    const material = base64ToBytes(raw);
    // Copy into a fresh ArrayBuffer — TS BufferSource typing rejects SharedArrayBuffer views.
    const keyBytes = new Uint8Array(material);
    const enc = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey("raw", keyBytes, "HKDF", false, [
      "deriveKey",
    ]);
    return window.crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: enc.encode("legalfinder.counsellor"),
        info: enc.encode(userId),
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  } catch {
    return null;
  }
}

async function encryptJson(userId: string, value: unknown): Promise<string | null> {
  const key = await getOrCreateDeviceKey(userId);
  if (!key) return null;
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const packed = new Uint8Array(iv.length + cipher.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipher), iv.length);
  return `${ENC_PREFIX}${bytesToBase64(packed)}`;
}

async function decryptJson<T>(userId: string, raw: string): Promise<T | null> {
  if (!raw.startsWith(ENC_PREFIX)) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  const key = await getOrCreateDeviceKey(userId);
  if (!key) return null;
  try {
    const packed = new Uint8Array(base64ToBytes(raw.slice(ENC_PREFIX.length)));
    const iv = packed.slice(0, 12);
    const data = packed.slice(12);
    const plain = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}

/**
 * Conversations are localStorage-only and keyed by Clerk user id. Never read/write under a
 * shared "anon" key for a signed-in person — that would leak chats across accounts on one device.
 * Blobs are AES-GCM encrypted at rest on this device (not E2E against XSS).
 */
export function loadConversations(userId: string | null | undefined): Conversation[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    // Sync path: plaintext legacy, or already-decrypted cache is not used — async hydrate
    // happens via loadConversationsAsync when the workspace mounts.
    if (raw.startsWith(ENC_PREFIX)) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadConversationsAsync(
  userId: string | null | undefined,
): Promise<Conversation[]> {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    if (raw.startsWith(ENC_PREFIX)) {
      const parsed = await decryptJson<Conversation[]>(userId, raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) return [];
    // Migrate plaintext → encrypted on first successful async load.
    await saveConversationsAsync(userId, parsed);
    return parsed;
  } catch {
    return [];
  }
}

export function saveConversations(
  userId: string | null | undefined,
  conversations: Conversation[],
) {
  if (typeof window === "undefined" || !userId) return;
  // Fire-and-forget encrypt; workspace also awaits saveConversationsAsync on critical paths.
  void saveConversationsAsync(userId, conversations);
}

export async function saveConversationsAsync(
  userId: string | null | undefined,
  conversations: Conversation[],
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const sliced = conversations.slice(0, 40);
    const encrypted = await encryptJson(userId, sliced);
    if (encrypted) {
      window.localStorage.setItem(keyFor(userId), encrypted);
      return;
    }
    // Web Crypto unavailable — fall back to plaintext rather than lose history.
    window.localStorage.setItem(keyFor(userId), JSON.stringify(sliced));
  } catch {
    // Quota or private mode — history is best-effort.
  }
}

export function loadResearchHistory(userId: string | null | undefined): ResearchHistoryEntry[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(researchKeyFor(userId));
    if (!raw) return [];
    if (raw.startsWith(ENC_PREFIX)) return [];
    const parsed = JSON.parse(raw) as ResearchHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadResearchHistoryAsync(
  userId: string | null | undefined,
): Promise<ResearchHistoryEntry[]> {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(researchKeyFor(userId));
    if (!raw) return [];
    if (raw.startsWith(ENC_PREFIX)) {
      const parsed = await decryptJson<ResearchHistoryEntry[]>(userId, raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    const parsed = JSON.parse(raw) as ResearchHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    await saveResearchHistoryAsync(userId, parsed);
    return parsed;
  } catch {
    return [];
  }
}

export function saveResearchHistory(
  userId: string | null | undefined,
  entries: ResearchHistoryEntry[],
) {
  if (typeof window === "undefined" || !userId) return;
  void saveResearchHistoryAsync(userId, entries);
}

export async function saveResearchHistoryAsync(
  userId: string | null | undefined,
  entries: ResearchHistoryEntry[],
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const sliced = entries.slice(0, 30);
    const encrypted = await encryptJson(userId, sliced);
    if (encrypted) {
      window.localStorage.setItem(researchKeyFor(userId), encrypted);
      return;
    }
    window.localStorage.setItem(researchKeyFor(userId), JSON.stringify(sliced));
  } catch {
    // Quota or private mode — history is best-effort.
  }
}

/** Wipe Counsellor chats + research + device key for one account (sign-out / consent off). */
export function clearCounsellorDataForUser(userId: string | null | undefined) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(keyFor(userId));
    window.localStorage.removeItem(researchKeyFor(userId));
    window.localStorage.removeItem(deviceKeyStorageKey(userId));
  } catch {
    // ignore
  }
}

/** Wipe every Counsellor key on this device (account delete / expired session). */
export function clearAllCounsellorData() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (
        key &&
        (key.startsWith(PREFIX) ||
          key.startsWith(RESEARCH_PREFIX) ||
          key.startsWith(KEY_PREFIX))
      ) {
        keys.push(key);
      }
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Test helper: encrypt/decrypt round-trip without touching conversation APIs. */
export async function __testEncryptRoundTrip(userId: string, value: unknown): Promise<unknown> {
  const encrypted = await encryptJson(userId, value);
  if (!encrypted) throw new Error("encrypt unavailable");
  return decryptJson(userId, encrypted);
}
