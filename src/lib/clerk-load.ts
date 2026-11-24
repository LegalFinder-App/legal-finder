/**
 * Clerk's `load()` sometimes never settles (network blip, extension interference).
 * Awaiting it without a timeout leaves authenticated routes stuck on a blank page —
 * root chrome (Counsellor FAB) still paints, but AppShell never mounts.
 */
export async function ensureClerkLoaded(
  clerk: Window["Clerk"] | undefined,
  timeoutMs = 4_000,
): Promise<Window["Clerk"] | undefined> {
  if (!clerk) return undefined;
  if (clerk.loaded) return clerk;

  await Promise.race([
    clerk.load().catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);

  return clerk;
}

export async function waitForWindowClerk(
  timeoutMs = 6_000,
): Promise<Window["Clerk"] | undefined> {
  if (typeof window === "undefined") return undefined;
  const start = Date.now();
  while (!window.Clerk && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return ensureClerkLoaded(window.Clerk, Math.min(4_000, timeoutMs));
}
