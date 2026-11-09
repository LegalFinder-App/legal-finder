import { createMiddleware } from "@tanstack/react-start";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";
import { enforceRateLimit, type RateLimitBucket } from "@/lib/rate-limit.server";

// requireClerkAuth plus one count against the bucket (limits in rate-limit.server.ts). Over the
// limit, the server function throws and the caller's toast shows the "too often" message. The
// .server import is only used inside .server(), which the client build strips — the same as
// auth-middleware.ts.
export const rateLimited = (bucket: RateLimitBucket) =>
  createMiddleware({ type: "function" })
    .middleware([requireClerkAuth])
    .server(async ({ next, context }) => {
      await enforceRateLimit(bucket, context.userId);
      return next();
    });
