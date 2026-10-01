import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { env } from "./env";

/**
 * Clerk on phones: the Expo SDK, with the session kept in the Keychain / Keystore. The desktop
 * build uses auth-provider.web.tsx instead; screens read the session through the same hooks either
 * way.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}
