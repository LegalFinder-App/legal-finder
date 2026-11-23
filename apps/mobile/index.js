// Load Node polyfills before any dependency that expects them (Clerk passkeys → buffer).
import "./src/lib/polyfills";
import "expo-router/entry";
