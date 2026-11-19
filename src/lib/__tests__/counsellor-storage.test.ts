import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function installLocalStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", {
    localStorage: storage,
    crypto: globalThis.crypto,
  });
  return map;
}

describe("counsellor storage privacy", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("clears chats, research, and device key for one user", async () => {
    const { clearCounsellorDataForUser, saveConversationsAsync, saveResearchHistoryAsync } =
      await import("@/components/app/counsellor/storage");

    await saveConversationsAsync("user_a", [
      { id: "1", title: "A", updatedAt: new Date().toISOString(), messages: [] },
    ]);
    await saveResearchHistoryAsync("user_a", []);
    clearCounsellorDataForUser("user_a");

    expect(localStorage.getItem("legalfinder.counsellor.v1:user_a")).toBeNull();
    expect(localStorage.getItem("legalfinder.counsellor.research.v1:user_a")).toBeNull();
    expect(localStorage.getItem("legalfinder.counsellor.key.v1:user_a")).toBeNull();
  });

  it("encrypts conversation blobs so localStorage is not plaintext JSON", async () => {
    const { saveConversationsAsync, loadConversationsAsync, __testEncryptRoundTrip } =
      await import("@/components/app/counsellor/storage");

    const sample = [
      {
        id: "c1",
        title: "Rights",
        updatedAt: "2026-01-01T00:00:00.000Z",
        messages: [{ id: "m1", role: "user" as const, content: "secret", createdAt: "2026-01-01T00:00:00.000Z" }],
      },
    ];

    await saveConversationsAsync("user_b", sample);
    const raw = localStorage.getItem("legalfinder.counsellor.v1:user_b");
    expect(raw).toBeTruthy();
    expect(raw?.startsWith("enc:v1:")).toBe(true);
    expect(raw).not.toContain("secret");

    const loaded = await loadConversationsAsync("user_b");
    expect(loaded[0]?.messages[0]?.content).toBe("secret");

    const roundTrip = await __testEncryptRoundTrip("user_b", { hello: "world" });
    expect(roundTrip).toEqual({ hello: "world" });
  });

  it("clearAllCounsellorData removes every counsellor prefix", async () => {
    const { clearAllCounsellorData, saveConversationsAsync } =
      await import("@/components/app/counsellor/storage");
    await saveConversationsAsync("user_c", [
      { id: "1", title: "X", updatedAt: new Date().toISOString(), messages: [] },
    ]);
    localStorage.setItem("unrelated", "keep");
    clearAllCounsellorData();
    expect(localStorage.getItem("legalfinder.counsellor.v1:user_c")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });
});

describe("session expired error detection", () => {
  it("recognises Clerk/session failures", async () => {
    const { isSessionExpiredError } = await import("@/lib/session-watchdog");
    expect(isSessionExpiredError(new Error("Please sign in again."))).toBe(true);
    expect(isSessionExpiredError(new Error("Unauthorized: No active Clerk session"))).toBe(true);
    expect(isSessionExpiredError(new Error("Network down"))).toBe(false);
  });
});
