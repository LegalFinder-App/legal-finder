import { Redirect } from "expo-router";

// legalfinder://sso-callback is consumed by the in-app browser auth session. On some Android
// devices the OS also delivers it to the router; land on home instead of an "unmatched route".
export default function SsoCallback() {
  return <Redirect href="/(tabs)" />;
}
