// Server-only. Signs a short-lived ImageKit upload for the web's getImageKitUploadAuth server
// function and the mobile app's /api/mobile/uploads/image-auth route.
import { createHmac, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase } from "@/integrations/supabase/app-database";

export async function createImageKitUploadAuth({
  supabase,
  userId,
  extension,
  purpose,
}: {
  supabase: SupabaseClient<AppDatabase>;
  userId: string;
  extension: string;
  purpose: "profile" | "content";
}) {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = process.env.VITE_IMAGEKIT_URL_ENDPOINT || process.env.IMAGEKIT_URL_ENDPOINT;

  if (!privateKey || !publicKey || !urlEndpoint) {
    const missing = [
      ...(!privateKey ? ["IMAGEKIT_PRIVATE_KEY"] : []),
      ...(!publicKey ? ["IMAGEKIT_PUBLIC_KEY"] : []),
      ...(!urlEndpoint ? ["VITE_IMAGEKIT_URL_ENDPOINT"] : []),
    ];
    throw new Error(`Image uploads are not configured. Missing: ${missing.join(", ")}.`);
  }

  const rootFolder = (process.env.IMAGEKIT_UPLOAD_FOLDER || "/legalfinder").replace(/\/$/, "");

  // "content" images (wanted persons, news, library covers, advice) are uploaded through the
  // admin CMS, which has no RLS policy of its own to lean on here — check the role explicitly.
  let folder = `${rootFolder}/profiles/${userId}`;
  let fileNamePrefix = "profile";
  if (purpose === "content") {
    const { data: callerRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleError) throw new Error(roleError.message);
    if (!callerRoles?.some((row) => row.role === "admin")) {
      throw new Error("Only administrators can upload content images.");
    }
    folder = `${rootFolder}/content`;
    fileNamePrefix = "content";
  }

  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 10 * 60;
  const signature = createHmac("sha1", privateKey).update(`${token}${expire}`).digest("hex");

  return {
    token,
    expire,
    signature,
    publicKey,
    urlEndpoint,
    folder,
    fileName: `${fileNamePrefix}-${Date.now()}${extension.toLowerCase()}`,
  };
}
