import { createMiddleware } from "@tanstack/react-start";
import { authenticateClerkRequest } from "./auth.server";

// The import above is only used inside .server(), which TanStack Start strips from the client
// build — the same way this middleware previously used provisioning.server directly.
export const requireClerkAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { supabase, userId } = await authenticateClerkRequest();
  return next({ context: { supabase, userId } });
});
