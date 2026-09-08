import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { ensureProfileProvisioned } from "@/integrations/clerk/provisioning.server";

/**
 * A plain `await auth()` inside a route's `beforeLoad` only works when beforeLoad happens to
 * run server-side — routes under `_authenticated` keep `ssr: false` (their auth check needs to
 * work on every client-side SPA navigation too, not just the initial page load), so beforeLoad
 * often runs in the browser instead. Wrapping the check in a server function guarantees auth()
 * always executes server-side (an RPC call), regardless of where beforeLoad itself runs.
 */
export const checkClerkSession = createServerFn({ method: "GET" }).handler(async () => {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated) return { userId: null };
  await ensureProfileProvisioned(userId);
  return { userId };
});
