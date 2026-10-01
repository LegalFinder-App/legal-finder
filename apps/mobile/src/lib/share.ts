import { Share } from "react-native";

/**
 * Hands some text to the system share sheet (save to Notes, send to another app…). The desktop
 * build has no share sheet, so share.web.ts shows the text with a Copy button instead.
 */
export async function shareText(message: string, title?: string): Promise<void> {
  await Share.share({ message, title });
}
