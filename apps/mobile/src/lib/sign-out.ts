import { router } from "expo-router";
import { showAlert } from "./alert";
import { useAuth, useClerk } from "./auth";
import { clearCounsellorDataForUser } from "./counsellor-storage";
import { unregisterPushDevice } from "./push";
import { queryClient } from "./query-client";

/** Asks first, then signs out and drops everything the session had loaded. */
export function useSignOut() {
  const clerk = useClerk();
  const { userId } = useAuth();

  return () =>
    showAlert("Sign out?", "You'll need to sign in again to see your matters and messages.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await unregisterPushDevice();
          // Clear before signOut while we still know whose cache this is.
          await clearCounsellorDataForUser(userId);
          await clerk.signOut();
          // Private data must not outlive the session on a shared device.
          queryClient.clear();
          router.replace("/(tabs)");
        },
      },
    ]);
}
