import * as ImagePicker from "expo-image-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import { api } from "./api";
import { formFile } from "./files";
import { supabase } from "./supabase";

// Phone cameras take 12–50 MP photos; ImageKit accepts up to 25 MB and resizes on delivery.
const MAX_BYTES = 20 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".jpg",
};

/** Picks one photo. "Compatible" makes iPhones hand over a JPEG rather than a HEIC original. */
export async function pickImage(options: { square?: boolean } = {}) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    ...(options.square ? { aspect: [1, 1] as [number, number] } : {}),
    quality: 0.8,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  return result.canceled ? null : (result.assets[0] ?? null);
}

/**
 * Same ImageKit flow as the web's src/lib/imagekit.ts: the server signs a short-lived upload
 * token (and enforces admin-only for "content" images), the file goes straight to ImageKit.
 */
export async function uploadImage(
  asset: ImagePickerAsset,
  purpose: "profile" | "content",
): Promise<string> {
  if (asset.fileSize && asset.fileSize > MAX_BYTES)
    throw new Error("That photo is too large. Choose one under 20 MB.");
  const mime = asset.mimeType && EXTENSIONS[asset.mimeType] ? asset.mimeType : "image/jpeg";
  const extension = EXTENSIONS[mime];
  const auth = await api.imageUploadAuth(extension, purpose);

  const form = new FormData();
  form.append("file", await formFile(asset.uri, auth.fileName, mime));
  form.append("fileName", auth.fileName);
  form.append("folder", auth.folder);
  form.append("token", auth.token);
  form.append("expire", String(auth.expire));
  form.append("signature", auth.signature);
  form.append("publicKey", auth.publicKey);
  form.append("useUniqueFileName", "true");
  form.append("tags", `${purpose},legalfinder`);

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: form,
  });
  const body = (await response.json().catch(() => null)) as {
    url?: string;
    message?: string;
  } | null;
  if (!response.ok || !body?.url) throw new Error(body?.message ?? "Image upload failed.");
  return body.url;
}

/** Uploads a profile photo and mirrors it onto the public advocate profile, like the web. */
export async function updateProfilePhoto(asset: ImagePickerAsset, userId: string): Promise<string> {
  const url = await uploadImage(asset, "profile");
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (error) throw new Error(error.message);
  const { data: lawyer } = await supabase
    .from("lawyers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (lawyer?.id) {
    const { error: lawyerError } = await supabase
      .from("lawyers")
      .update({ photo_url: url })
      .eq("id", lawyer.id);
    if (lawyerError) throw new Error(lawyerError.message);
  }
  return url;
}
