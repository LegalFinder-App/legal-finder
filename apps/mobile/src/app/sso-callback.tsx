import { Redirect } from "expo-router";

// legalfinder://sso-callback closes the in-app sign-in browser, and +native-intent stops the router
// acting on it while the app is running. The router only lands here on a cold start (the app was
// killed while the browser was open) — go home rather than show an "unmatched route".
export default function SsoCallback() {
  return <Redirect href="/(tabs)" />;
}
