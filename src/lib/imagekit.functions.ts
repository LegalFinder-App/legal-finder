import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";

// Also used by /api/mobile/uploads/image-auth to validate the native app's requests identically.
export const uploadRequestSchema = z.object({
  extension: z.string().regex(/^\.[a-z0-9]{1,5}$/i),
  purpose: z.enum(["profile", "content"]).default("profile"),
});

export const getImageKitUploadAuth = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator(uploadRequestSchema)
  .handler(async ({ context, data }) => {
    const { createImageKitUploadAuth } = await import("@/lib/imagekit.server");
    return createImageKitUploadAuth({
      supabase: context.supabase,
      userId: context.userId,
      extension: data.extension,
      purpose: data.purpose,
    });
  });
