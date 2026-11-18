/** Client-safe attachment types for Counsellor AI multimodal turns. */

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

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
