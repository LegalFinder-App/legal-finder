import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import { File, Paths } from "expo-file-system";

// The parts of file handling that differ between phones and the desktop app (files.web.ts).

/** Reads a picked file (a file:// or content:// URI) into memory. */
export async function readFileBytes(uri: string): Promise<ArrayBuffer> {
  return new File(uri).arrayBuffer();
}

/** A picked file as a multipart form value — React Native's FormData takes a file descriptor. */
export async function formFile(uri: string, name: string, type: string): Promise<Blob> {
  return { uri, name, type } as unknown as Blob;
}

/** Hands a remote file to the share sheet (save to Files, send to another app…). */
export async function saveOrShareFile(url: string, name: string, mimeType?: string | null) {
  if (!(await Sharing.isAvailableAsync())) {
    await WebBrowser.openBrowserAsync(url);
    return;
  }
  const target = new File(Paths.cache, name.replace(/[^\w.-]+/g, "_"));
  if (target.exists) target.delete();
  const downloaded = await File.downloadFileAsync(url, target);
  await Sharing.shareAsync(downloaded.uri, {
    mimeType: mimeType ?? undefined,
    dialogTitle: name,
  });
}
