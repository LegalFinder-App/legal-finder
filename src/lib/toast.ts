import { toast as sonnerToast } from "sonner";
import { haptics } from "@/lib/native";

/**
 * Drop-in replacement for sonner's `toast` that also fires native haptic feedback on
 * success/error toasts (a no-op outside the Capacitor app). Every other method (info,
 * warning, promise, dismiss, ...) delegates straight through to sonner unchanged.
 */
export const toast: typeof sonnerToast = ((...args: Parameters<typeof sonnerToast>) =>
  sonnerToast(...args)) as typeof sonnerToast;

Object.assign(toast, sonnerToast, {
  success: (...args: Parameters<typeof sonnerToast.success>) => {
    void haptics.success();
    return sonnerToast.success(...args);
  },
  error: (...args: Parameters<typeof sonnerToast.error>) => {
    void haptics.error();
    return sonnerToast.error(...args);
  },
});
