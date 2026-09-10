import type { CapacitorConfig } from "@capacitor/cli";

// `npx cap sync` (run from this directory) reads this file once with Node and bakes the
// resolved server.url into the generated native project — so VITE_APP_URL must be set in your
// shell/.env at sync time, not at app-launch time (there is no .env file on an installed app).
// Falls back to the real production URL so a forgotten env var still ships something correct
// rather than silently defaulting to localhost. Override VITE_APP_URL for a staging sync.
const PRODUCTION_APP_URL = "https://legalfinder.co";
const APP_URL = process.env.VITE_APP_URL || PRODUCTION_APP_URL;

// This app runs in "remote content" mode: the WebView navigates straight to the real deployed
// site (server.url below) instead of bundling a local copy of the client. See
// platforms/mobile/README.md for why — in short, it keeps Clerk's session cookies same-origin
// and avoids duplicating the backend. `webDir` still has to point at something real (Capacitor's
// CLI validates it during sync), even though its contents are only shown for a split second
// before the WebView redirects, or if server.url is ever misconfigured.
const config: CapacitorConfig = {
  appId: "com.legalfinder.app",
  appName: "LegalFinder",
  webDir: "www",
  android: {
    path: "android",
  },
  ios: {
    path: "ios",
  },
  server: {
    url: APP_URL,
    cleartext: false,
    androidScheme: "https",
    // Shown if the device can't reach APP_URL (see platforms/mobile/README.md).
    errorPath: "offline.html",
  },
  plugins: {
    // Matches the app's dark "ink" background (see --background/--ink in src/styles.css and
    // the generated splash assets under android/app/src/main/res/drawable*/splash.png).
    // launchAutoHide: false hands control to src/lib/native.ts, which hides the splash once
    // the themed app shell has actually painted instead of Capacitor's fixed native timeout.
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#1a2338",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      overlaysWebView: false,
    },
  },
};

export default config;
