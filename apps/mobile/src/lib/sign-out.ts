import { router } from "expo-router";
import { showAlert } from "./alert";
import { useClerk } from "./auth";
import { unregisterPushDevice } from "./push";
import { queryClient } from "./query-client";

/** Asks first, then signs out and drops everything the session had loaded. */
export function useSignOut() {
  const clerk = useClerk();

  return () =>
    showAlert("Sign out?", "You'll need to sign in again to see your matters and messages.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await unregisterPushDevice();
          await clerk.signOut();
          // Private data must not outlive the session on a shared device.
          queryClient.clear();
          router.replace("/(tabs)");
        },
      },
    ]);
}
