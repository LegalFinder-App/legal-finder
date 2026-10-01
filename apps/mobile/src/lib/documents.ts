import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { readFileBytes, saveOrShareFile } from "./files";
import { supabase } from "./supabase";
import type { DocumentRow } from "./queries";

const BUCKET = "documents";
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Picks a file and stores it exactly as the web's DocumentVault does: object at
 * `<userId>/<timestamp>-<safe name>` in the private `documents` bucket, then a `documents` row.
 * Returns null if the user cancelled the picker.
 */
export async function pickAndUploadDocument(
  userId: string,
  caseId?: string | null,
): Promise<DocumentRow | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;
  const asset = picked.assets[0];
  if (asset.size && asset.size > MAX_BYTES) throw new Error("That file is larger than 25 MB.");

  const bytes = await readFileBytes(asset.uri);
  const safeName = asset.name.replace(/[^\w.-]+/g, "_");
  const storagePath = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { upsert: false, contentType: asset.mimeType ?? undefined });
  if (uploadError) throw new Error(uploadError.message || "Upload failed");

  const { data, error } = await supabase
    .from("documents")
    .insert({
      owner_id: userId,
      case_id: caseId ?? null,
      name: asset.name,
      storage_path: storagePath,
      mime_type: asset.mimeType ?? null,
      size_bytes: asset.size ?? bytes.byteLength,
      category: "general",
    })
    .select()
    .single();
  if (error) {
    // Don't leave an orphaned object behind if the metadata row was rejected (e.g. by RLS).
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }
  return data as DocumentRow;
}

// Signed URLs are short-lived on purpose: case files are confidential.
async function signedUrl(doc: DocumentRow): Promise<string> {
  if (!doc.storage_path) throw new Error("This document has no stored file.");
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, 120);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Couldn't open the document.");
  return data.signedUrl;
}

export async function openDocument(doc: DocumentRow) {
  await WebBrowser.openBrowserAsync(await signedUrl(doc));
}

export async function shareDocument(doc: DocumentRow) {
  await saveOrShareFile(await signedUrl(doc), doc.name, doc.mime_type);
}
