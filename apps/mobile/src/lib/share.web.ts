import * as Clipboard from "expo-clipboard";
import { showAlert } from "./alert";
import { toast } from "./toast";

/** Desktop counterpart of share.ts: show the text and offer to copy it. */
export async function shareText(message: string, title = "Copy and keep this"): Promise<void> {
  showAlert(title, message, [
    { text: "Close", style: "cancel" },
    {
      text: "Copy",
      onPress: () => {
        void Clipboard.setStringAsync(message).then(() => toast.success("Copied to clipboard"));
      },
    },
  ]);
}
