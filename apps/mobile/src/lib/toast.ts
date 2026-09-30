import * as Haptics from "expo-haptics";
import { toast as sonner } from "sonner-native";

type Options = { description?: string };

// Same shape as the web app's @/lib/toast (sonner + haptics), so screens ported from the web keep
// their toast calls unchanged.
export const toast = {
  success(title: string, options?: Options) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    sonner.success(title, options);
  },
  error(title: string, options?: Options) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    sonner.error(title, options);
  },
  message(title: string, options?: Options) {
    sonner(title, options);
  },
};

export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error && error.message) return error.message;
  // Clerk API errors carry their human message in errors[0].longMessage.
  const clerk = error as { errors?: { longMessage?: string; message?: string }[] } | null;
  const first = clerk?.errors?.[0];
  return first?.longMessage ?? first?.message ?? fallback;
}
