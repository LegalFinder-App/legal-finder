import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { api } from "./api";
import { formFile } from "./files";

export type AttachmentKind = "image" | "pdf";

export type CounsellorAttachment = {
  id: string;
  kind: AttachmentKind;
  url: string;
  name: string;
  mimeType: string;
  size: number;
};

export const MAX_ATTACHMENTS = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 8 * 1024 * 1024;

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Server Zod requires size > 0; pickers often omit fileSize on Android. */
async function resolveByteSize(uri: string, reported?: number | null): Promise<number> {
  if (reported && reported > 0) return reported;
  try {
    const size = new File(uri).size;
    if (typeof size === "number" && size > 0) return size;
  } catch {
    // fall through
  }
  throw new Error("Couldn't read that file's size. Try another file.");
}

async function uploadToImageKit(
  uri: string,
  mime: string,
  fileName: string,
  extension: string,
): Promise<string> {
  const auth = await api.imageUploadAuth(extension, "assistant");
  const form = new FormData();
  form.append("file", await formFile(uri, auth.fileName || fileName, mime));
  form.append("fileName", auth.fileName);
  form.append("folder", auth.folder);
  form.append("token", auth.token);
  form.append("expire", String(auth.expire));
  form.append("signature", auth.signature);
  form.append("publicKey", auth.publicKey);
  form.append("useUniqueFileName", "true");
  form.append("tags", "assistant,legalfinder");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: form,
  });
  const body = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
  if (!response.ok || !body?.url) throw new Error(body?.message ?? "Upload failed.");
  return body.url;
}

export async function pickCounsellorImage(): Promise<CounsellorAttachment | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  const size = await resolveByteSize(asset.uri, asset.fileSize);
  if (size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be under 5 MB.");
  }
  const mime = asset.mimeType?.startsWith("image/") ? asset.mimeType : "image/jpeg";
  const ext = mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : ".jpg";
  const url = await uploadToImageKit(asset.uri, mime, asset.fileName ?? `photo${ext}`, ext);
  return {
    id: newId(),
    kind: "image",
    url,
    name: asset.fileName ?? `photo${ext}`,
    mimeType: mime,
    size,
  };
}

export async function pickCounsellorPdf(): Promise<CounsellorAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  const size = await resolveByteSize(asset.uri, asset.size);
  if (size > MAX_PDF_BYTES) {
    throw new Error("PDFs must be under 8 MB.");
  }
  const url = await uploadToImageKit(
    asset.uri,
    "application/pdf",
    asset.name || "document.pdf",
    ".pdf",
  );
  return {
    id: newId(),
    kind: "pdf",
    url,
    name: asset.name || "document.pdf",
    mimeType: "application/pdf",
    size,
  };
}
