import { upload } from "@imagekit/javascript";
import { supabase } from "@/integrations/supabase/client";
import { getImageKitUploadAuth } from "@/lib/imagekit.functions";

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadProfileImage(file: File, userId: string): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Profile images must be 5 MB or smaller.");
  }

  const auth = await getImageKitUploadAuth({
    data: { extension: extensionFor(file), purpose: "profile" },
  });
  const response = await upload({
    file,
    fileName: auth.fileName,
    folder: auth.folder,
    token: auth.token,
    expire: auth.expire,
    signature: auth.signature,
    publicKey: auth.publicKey,
    useUniqueFileName: true,
    tags: ["profile", "legalfinder"],
  });

  if (!response.url) {
    throw new Error("Upload succeeded, but no URL was returned from ImageKit.");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: response.url })
    .eq("id", userId);
  if (profileError) throw profileError;

  // Advocates keep a mirrored photo on the public lawyer directory.
  const { data: lawyerRow, error: lawyerLookupError } = await supabase
    .from("lawyers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (lawyerLookupError) throw lawyerLookupError;

  if (lawyerRow?.id) {
    const { error: lawyerError } = await supabase
      .from("lawyers")
      .update({ photo_url: response.url })
      .eq("id", lawyerRow.id);
    if (lawyerError) throw lawyerError;
  }

  return response.url;
}

const MAX_CONTENT_IMAGE_BYTES = 5 * 1024 * 1024;

/** Used by the admin content manager (wanted persons, news, library covers, legal advice). */
export async function uploadContentImage(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_CONTENT_IMAGE_BYTES) {
    throw new Error("Images must be 5 MB or smaller.");
  }

  const auth = await getImageKitUploadAuth({
    data: { extension: extensionFor(file), purpose: "content" },
  });
  const response = await upload({
    file,
    fileName: auth.fileName,
    folder: auth.folder,
    token: auth.token,
    expire: auth.expire,
    signature: auth.signature,
    publicKey: auth.publicKey,
    useUniqueFileName: true,
    tags: ["content", "legalfinder"],
  });

  if (!response.url) {
    throw new Error("Upload succeeded, but no URL was returned from ImageKit.");
  }

  return response.url;
}

function extensionFor(file: File): string {
  const fromName = file.name.match(/\.(jpe?g|png|webp)$/i)?.[0];
  if (fromName) return fromName.toLowerCase();
  return file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
}
