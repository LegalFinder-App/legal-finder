import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { env } from "./env";
import { isExpoGo } from "./runtime";

type Passkeys = NonNullable<
  React.ComponentProps<typeof ClerkProvider>["__experimental_passkeys"]
>;

function loadPasskeys(): Passkeys | undefined {
  if (isExpoGo) return undefined;
  try {
    // Native / EAS only. Expo Go must not load @clerk/expo-passkeys (Node buffer + native).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("@clerk/expo/passkeys") as { passkeys: Passkeys }).passkeys;
  } catch {
    return undefined;
  }
}

/**
 * Clerk on phones: Expo SDK + Keychain/Keystore session.
 * Passkeys stay off in Expo Go. Desktop uses auth-provider.web.tsx.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const passkeys = loadPasskeys();
  return (
    <ClerkProvider
      publishableKey={env.clerkPublishableKey}
      tokenCache={tokenCache}
      {...(passkeys ? { __experimental_passkeys: passkeys } : {})}
    >
      {children}
    </ClerkProvider>
  );
}
