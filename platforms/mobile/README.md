# Mobile wrapper (superseded)

> **This is the old Capacitor wrapper. It is no longer what ships.** The Android and iOS apps are
> now the native app in `apps/mobile/` (see its README). This folder is kept for reference; the
> only live things in it are `store-assets/` (Play Console graphics) and
> `android/keystore.properties` (the Play upload key the native app also signs with). Don't build
> or upload from here — its version codes are behind the Play listing.

What follows describes the wrapper as it was: Capacitor wrapping the web app in "remote content"
mode (the app loaded the deployed site rather than a bundled copy).

## One-time setup

1. Deploy the web app (already done — Vercel) and note its production URL.
2. Set `VITE_APP_URL` to that URL wherever you run the commands below (shell env var, or a local
   `.env` your shell loads). `platforms/mobile/capacitor.config.ts` reads it once, at sync time,
   and bakes the resolved URL into the generated native project — it is **not** read again at
   app launch, so re-run `npx cap sync` any time the production URL changes.
3. Generate icons and splash screens from the shared source image:
   ```
   npm run mobile:icons
   ```

## Android (buildable on this machine)

```
npm run mobile:sync           # capacitor sync — run after any config or icon change
npm run mobile:android:open   # opens platforms/mobile/android in Android Studio
npm run mobile:android:build  # headless debug APK build via Gradle
```

The debug APK lands at `platforms/mobile/android/app/build/outputs/apk/debug/app-debug.apk` —
install it on a device/emulator with `adb install -r <path>`.

For a Play Store release build you need a signing keystore (Android Studio: Build > Generate
Signed Bundle/APK, or `keytool` directly) and to configure `android/app/build.gradle`'s
`signingConfigs` — this is a one-time setup documented in
[Android's own signing guide](https://developer.android.com/studio/publish/app-signing).

## iOS (requires a Mac — not buildable on this machine)

See `ios/README.md` once the project is generated, or `.github/workflows/mobile-ios-build.yml`
for a CI path that doesn't require owning a Mac.

## Push notifications — known gap

The web app's existing notifications use standard Web Push (VAPID, see `public/sw.js` and the
`push_subscriptions` table). That works fine on the web/PWA and reasonably on Android's Chromium
WebView, but **does not work on iOS**: WKWebView doesn't support the Push API when embedded
inside a third-party native app shell (this is different from Safari's own home-screen PWA push
support, which only applies to pages added to the home screen through Safari itself, not to a
WebView embedded in another app). A real fix needs Capacitor's
[`@capacitor/push-notifications`](https://capacitorjs.com/docs/apis/push-notifications) plugin
bridging to APNs (iOS) and FCM (Android), which requires its own Apple/Firebase project setup and
a small server-side addition (device-token storage + a native send path alongside the existing
web-push fanout). Not implemented yet — flagging so it isn't mistaken for an oversight if push
silently doesn't fire on an iOS install.

## Store submission checklist

Neither store checklist item below is something to fabricate — they need real business/legal
input from you:

- **App Store Connect**: Apple Developer Program membership ($99/yr), app privacy policy URL,
  App Privacy "nutrition label" (what data is collected — this app touches auth, messaging,
  payments, and location-adjacent legal case data, so fill this in carefully), screenshots per
  required device size, support URL.
- **Play Console**: $25 one-time registration, Data Safety form (same considerations as above),
  content rating questionnaire, screenshots, feature graphic.
- Both stores will review a Capacitor "remote content" app — see the risk note in
  `../README.md` about Apple guideline 4.7.1 before submitting to the App Store specifically.
