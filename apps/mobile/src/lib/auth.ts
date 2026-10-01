// One import for Clerk everywhere in the app. On phones it is the Expo SDK; the desktop build
// resolves auth.web.ts instead. Don't import @clerk/expo (or @clerk/react) directly from screens.
export { useAuth, useClerk, useSignIn, useSignUp, useUser } from "@clerk/expo";
export { AuthProvider } from "./auth-provider";
