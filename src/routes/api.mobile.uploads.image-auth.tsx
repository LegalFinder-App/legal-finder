import { createFileRoute } from "@tanstack/react-router";
import { uploadRequestSchema } from "@/lib/imagekit.functions";

export const Route = createFileRoute("/api/mobile/uploads/image-auth")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { mobilePost } = await import("@/lib/mobile-api.server");
        const { createImageKitUploadAuth } = await import("@/lib/imagekit.server");
        return mobilePost(
          uploadRequestSchema,
          ({ userId, supabase }, body) =>
            createImageKitUploadAuth({
              supabase,
              userId,
              extension: body.extension,
              purpose: body.purpose ?? "profile",
            }),
          { rateLimit: "uploads" },
        )(ctx);
      },
    },
  },
});
