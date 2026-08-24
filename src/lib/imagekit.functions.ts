import { createHmac, randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uploadRequestSchema = z.object({
  extension: z.string().regex(/^\.[a-z0-9]{1,5}$/i),
});

export const getImageKitUploadAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(uploadRequestSchema)
  .handler(({ context, data }) => {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
    const urlEndpoint = process.env.VITE_IMAGEKIT_URL_ENDPOINT;

    if (!privateKey || !publicKey || !urlEndpoint) {
      throw new Error(
        "Image uploads are not configured. Set the required ImageKit environment variables.",
      );
    }

    const token = randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 10 * 60;
    const signature = createHmac("sha1", privateKey).update(`${token}${expire}`).digest("hex");
    const rootFolder = (process.env.IMAGEKIT_UPLOAD_FOLDER || "/legalfinder").replace(/\/$/, "");

    return {
      token,
      expire,
      signature,
      publicKey,
      urlEndpoint,
      folder: `${rootFolder}/profiles/${context.userId}`,
      fileName: `profile-${Date.now()}${data.extension.toLowerCase()}`,
    };
  });
