import { createFileRoute } from "@tanstack/react-router";

// First call from the native app after sign-in: authenticating provisions the profile and default
// role (same as the web's checkClerkSession), then the caller's roles are returned.
export const Route = createFileRoute("/api/mobile/session")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { mobilePost } = await import("@/lib/mobile-api.server");
        return mobilePost(null, async ({ userId, supabase }) => {
          const { data, error } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);
          if (error) throw new Error(error.message);
          return { userId, roles: (data ?? []).map((row) => row.role) };
        })(ctx);
      },
    },
  },
});
