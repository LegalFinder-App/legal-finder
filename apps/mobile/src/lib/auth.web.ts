// Desktop counterpart of auth.ts. The hooks must come from the same copy of @clerk/react as the
// provider in auth-provider.web.tsx: @clerk/expo loads the package's CommonJS build, which has its
// own React context and would not see that provider ("useAuth can only be used within
// <ClerkProvider />").
export { useAuth, useClerk, useSignIn, useSignUp, useUser } from "@clerk/react";
export { AuthProvider } from "./auth-provider";
