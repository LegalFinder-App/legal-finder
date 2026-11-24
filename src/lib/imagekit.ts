import { upload } from "@imagekit/javascript";
import { supabase } from "@/integrations/supabase/client";
import { clerkApiHeaders, requireClerkApiHeaders } from "@/lib/clerk-browser-token";

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ImageKitUploadAuth = {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
  folder: string;
  fileName: string;
};

/**
 * Signs an ImageKit upload via /api/uploads/image-auth (Bearer + cookies), matching Counsellor
 * stream auth so cookie lag cannot surface "No active Clerk session" while the UI is signed in.
 */
async function fetchImageKitUploadAuth(input: {
  extension: string;
  purpose: "profile" | "content" | "assistant";
}): Promise<ImageKitUploadAuth> {
  const body = JSON.stringify(input);

  const post = async (headers: Record<string, string>) =>
    fetch("/api/uploads/image-auth", {
      method: "POST",
      credentials: "include",
      headers,
      body,
    });

  let response = await post(
    await requireClerkApiHeaders({
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
  );

  if (response.status === 401) {
    response = await post(
      await clerkApiHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
    );
  }

  if (!response.ok) {
    let message = "Couldn't prepare the upload.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // Non-JSON body.
    }
    if (response.status === 401 || /clerk session|sign in again|unauthorized/i.test(message)) {
      throw new Error("Please sign in again.");
    }
    throw new Error(message);
  }

  return (await response.json()) as ImageKitUploadAuth;
}

export async function uploadProfileImage(file: File, userId: string): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Profile images must be 5 MB or smaller.");
  }

  const auth = await fetchImageKitUploadAuth({
    extension: extensionFor(file),
    purpose: "profile",
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

  const auth = await fetchImageKitUploadAuth({
    extension: extensionFor(file),
    purpose: "content",
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

const MAX_ASSISTANT_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_ASSISTANT_PDF_BYTES = 8 * 1024 * 1024;
const ASSISTANT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Counsellor AI attachments — stored under the signed-in user's assistant folder. */
export async function uploadAssistantAttachment(file: File): Promise<{
  url: string;
  kind: "image" | "pdf";
  mimeType: string;
  name: string;
  size: number;
}> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isImage = ASSISTANT_IMAGE_TYPES.has(file.type);

  if (!isPdf && !isImage) {
    throw new Error("Attach a JPG, PNG, WebP image, or a PDF.");
  }
  if (isImage && file.size > MAX_ASSISTANT_IMAGE_BYTES) {
    throw new Error("Images must be 5 MB or smaller.");
  }
  if (isPdf && file.size > MAX_ASSISTANT_PDF_BYTES) {
    throw new Error("PDFs must be 8 MB or smaller.");
  }

  const extension = isPdf ? ".pdf" : extensionFor(file);
  const auth = await fetchImageKitUploadAuth({
    extension,
    purpose: "assistant",
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
    tags: ["assistant", "legalfinder"],
  });

  if (!response.url) {
    throw new Error("Upload succeeded, but no URL was returned from ImageKit.");
  }

  return {
    url: response.url,
    kind: isPdf ? "pdf" : "image",
    mimeType: isPdf ? "application/pdf" : file.type,
    name: file.name,
    size: file.size,
  };
}

function extensionFor(file: File): string {
  const fromName = file.name.match(/\.(jpe?g|png|webp)$/i)?.[0];
  if (fromName) return fromName.toLowerCase();
  return file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
}
