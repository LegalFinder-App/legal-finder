# LegalFinder — the app (Android, iOS, desktop)

The LegalFinder app, built with **Expo SDK 57** (React Native 0.86, Expo Router, TypeScript). One
codebase ships as:

- the **native Android and iOS apps** — replacing the old Capacitor WebView wrapper in
  `platforms/mobile/`, under the **same package / bundle id (`com.legalfinder.app`) and the same
  Android upload key**, so it installs as an update to the existing Play listing;
- the **Windows, macOS and Linux apps** — the same screens exported for the web
  (`expo export --platform web`) and packaged by the Electron shell in `platforms/desktop/`.

It talks to the same backend as the website:

- **Supabase** directly for data, with the same queries and RLS policies as the web
  (`src/lib/queries.ts` mirrors `../../src/lib/queries.ts`).
- **Clerk** for auth — email/password, sign-up with email codes, required MFA (authenticator
  setup, TOTP/SMS/backup codes), password reset, and Google/Apple/LinkedIn through the system
  browser (Google blocks sign-in inside WebViews). Phones use `@clerk/expo`; the desktop build runs
  Clerk in the same token-based mode (`src/lib/auth-provider.web.tsx`).
- **`/api/mobile/*`** on the web app for anything that needs a server secret or can't run on a
  phone: payments (Pesapal), retrying an advocate's payout (admins), the AI assistant, document
  generation (the web's PDF templates, rendered on the server, plus AI drafting), image-upload
  signing, push-token registration and account deletion. Those routes reuse the web's own server
  logic (`src/lib/*.server.ts`). The app and the website are released separately, so a new route
  must be deployed before an app build that calls it reaches users; until then the app reports
  that the feature isn't available on the server yet (`src/lib/api.ts`).

## Setup

```bash
cd apps/mobile
npm install
cp .env.example .env        # fill in the public keys (same values as the web's VITE_* keys)
npm run typecheck && npm run lint
```

Types for the database come from the web app — run `npm run sync-types` after any migration.

## Running

Native modules (Clerk, biometrics, notifications…) mean **Expo Go is not enough**; use a
development build:

```bash
npx expo run:android          # builds + installs a dev build on a device/emulator
npx expo run:ios              # macOS only
npx expo start --dev-client   # then iterate with fast refresh
```

The desktop app runs on any development machine with no device at all — see
`../../platforms/desktop/README.md` ("Running it"). Because it runs the same screens, it is also
the quickest way to see a change to shared code.

## One codebase, three runtimes

Most code is shared. Where a phone API doesn't exist on desktop (or the reverse), the difference
lives in a pair of files — `thing.ts` for phones and `thing.web.ts` for the desktop build, with the
same exports — never in `Platform.OS` checks scattered through screens:

| Shared import            | Phones                              | Desktop (`.web`)                            |
| ------------------------ | ----------------------------------- | ------------------------------------------- |
| `lib/auth`               | `@clerk/expo`                       | `@clerk/react` + a token-mode Clerk instance |
| `lib/secure-store`       | Keychain / Keystore                 | the shell's OS-keychain store               |
| `lib/browser-session`    | in-app browser sheet                | system browser + `legalfinder://` return    |
| `lib/social-sign-in`     | Clerk's `useSSO`                    | the same steps through the system browser   |
| `lib/alert`, `lib/share` | native alert / share sheet          | in-app dialog / copy to clipboard           |
| `lib/files`              | `expo-file-system`, share sheet     | blobs, Save dialog                          |
| `lib/push`               | Expo push                           | not available (controls hidden)             |
| `components/BiometricGate` | Face ID / fingerprint lock        | not available (control hidden)              |
| `components/ui/DateTimeField` | native picker                  | the browser engine's date input             |

Layout adapts through `useWideLayout()` (`lib/layout.ts`): on a wide desktop window
`components/DesktopShell` shows a sidebar instead of the tab bar and content is centred.

## Releasing

### Android (buildable on Windows)

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

On this Windows machine the shell environment needs two overrides for Gradle (the system
`JAVA_HOME` points at a JDK's `bin/` folder, and `ANDROID_HOME` isn't set):

```bash
ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" JAVA_HOME="C:/Program Files/Java/jdk-21" ./gradlew.bat bundleRelease
```

A clean release build takes one to two hours here (four CPU architectures of native code, on
8 GB of memory); later builds are incremental. When only JavaScript and the version code have
changed, skip `prebuild --clean` (it deletes `android/` and with it the two hours of native build
output): set `versionCode` in `android/app/build.gradle` to match `ANDROID_VERSION_CODE` and run
the Gradle command — about ten minutes (build 8 was made this way and checked: version code,
signing certificate, contents). It is the one hand-edit of `android/` that is safe, because the
next clean prebuild writes the same value from `app.config.ts`. Anything else there (plugins,
permissions, icons, native dependencies) does need the clean prebuild. Reinstalling `node_modules` makes the next build a
clean one again — each library's Android build output lives inside its package folder. Native (CMake) intermediates go to `~/.cxx-lf/` instead of each module's
`.cxx/` folder — `plugins/withShortNativeBuildPaths.js` does that because the repo's deep path
pushed ninja past Windows' 260-character limit ("build.ninja still dirty after 100 tries"). If
native build errors look stale after a dependency upgrade, delete `~/.cxx-lf/`.

Release builds are signed by `plugins/withReleaseSigning.js` with the upload key in
`../../platforms/mobile/android/keystore.properties` (gitignored — back it up). Bump
`ANDROID_VERSION_CODE` in `app.config.ts` for every Play upload.

Copy the bundle to `release/LegalFinder-<version>-build<versionCode>.aab` (gitignored) before
uploading: `android/` is wiped by the next `prebuild --clean`, and the old wrapper's output in
`platforms/mobile/android/` is also called `app-release.aab` — don't upload that one.

### iOS / cloud builds

iOS can't be built on Windows. EAS Build compiles it on Expo's servers (no Mac needed);
`eas.json` has the profiles. One-time setup, from a terminal in `apps/mobile` — the Apple login is
interactive, so this part can't be scripted:

1. `npx eas-cli@latest login`. The Expo project already exists (`@ochienodavid/legalfinder`,
   created with `eas init` on 2026-10-02); its id and owner are constants in `app.config.ts`.
   `eas init` can't write to a `.ts` config, so on a new project it ends with "Cannot
   automatically write to dynamic config" after creating the project — copy the id it prints
   into `EAS_PROJECT_ID` there. `npx eas-cli@latest project:info` confirms the link.
2. Give the cloud build the public keys it can't read from your gitignored `.env`:
   `npx eas-cli@latest env:push production --path .env` uploads the four `EXPO_PUBLIC_*` values
   as EAS environment variables (or add them at expo.dev → the project → Environment variables;
   see <https://docs.expo.dev/eas/environment-variables/>). `eas env:list production` shows them.
3. `npx eas-cli@latest build --platform ios --profile production`. It asks for your Apple
   Developer login and creates (or reuses) the distribution certificate and provisioning profile.
   Once those are stored on EAS (they are, since 2026-10-02), later builds need no Apple login:
   add `--non-interactive --no-wait` and follow the build at the link it prints.
4. `npx eas-cli@latest submit --platform ios` uploads the build to App Store Connect / TestFlight.

The app is **iPhone only** for now (`supportsTablet: false` in `app.config.ts`): the layout has
never been run on an iPad, and iPad support can be added later but not removed once a version has
shipped with it.

What gets uploaded is decided by `.easignore` at the repo root, not by `.gitignore`: it is an
allow-list of this folder minus its generated and local files (about 2 MB). Keep it that way —
on Windows eas-cli ignores `.gitignore` files in subfolders, and without `.easignore` it packs
`android/` (gigabytes of build output) and the signed bundles in `release/`. To see exactly what
would be sent, without starting a build:
`npx eas-cli@latest build:inspect -p ios -s archive -o <empty folder>`.

After that first build, `.github/workflows/mobile-eas-build.yml` can queue builds from GitHub
(needs the `EXPO_TOKEN` repository secret). Versions come from `app.config.ts`
(`appVersionSource: "local"`): bump `IOS_BUILD_NUMBER` for every upload.

Apple's and Google's reviewers need an account that can pass two-step verification. The demo
accounts, their backup codes, the listing text, privacy answers and screenshots are in
`../../store-listing/` (start with its README); `node scripts/reviewer-accounts.mjs codes` from
the repo root issues fresh backup codes before each submission.

The same profiles build Android in the cloud (`--platform android`) if this machine is short on
disk; upload the existing upload keystore to EAS first (`eas credentials`) so Play accepts it.

### Push notifications (optional)

The app hides its push controls until `PUSH_ENABLED` in `app.config.ts` is `true` — and, on
Android, until the build includes Firebase's config (`pushAvailable()` in `src/lib/push.ts`); the
in-app notifications list keeps working. The flag exists because every build now carries the EAS
project id, and with only that the switch would appear on iOS and fail when tapped. Steps 1, 2 and
5 are build-time settings, so rebuild (`expo prebuild --clean`, then the release build) after them.

1. **Expo project** — done: the project id is in `app.config.ts` (Expo push tokens are issued per
   project).
2. **Android (FCM)** — in the Firebase console create a project, add an Android app with the
   package `com.legalfinder.app`, and save its `google-services.json` in `apps/mobile/`
   (`plugins/withOptionalGoogleServices.js` picks it up; it holds no secret keys, so it can be
   committed).
   Then upload that Firebase project's **FCM V1 service account key** to Expo: expo.dev → the
   project → Credentials → Android, or `npx eas-cli@latest credentials`.
3. **iOS (APNs)** — `eas build -p ios` / `eas credentials` creates and stores the APNs key.
4. **Database** — apply `supabase/migrations/20260930120000_mobile_push_notifications.sql`
   (`npm run db:migrate` from the repo root). It stores device tokens and forwards each new
   notification and message to Expo's push service.
5. **Switch it on** — set `PUSH_ENABLED = true` in `app.config.ts` and rebuild.

## One-time dashboard configuration

- **Clerk → Native applications**: the Native API must be enabled, and `legalfinder://sso-callback`
  must be in the allow-list for mobile SSO redirects (needed for Google/Apple/LinkedIn sign-in in
  the phone and desktop apps). Both are in place on the production instance as of 2026-10-01.
- **Clerk → Social connections**: production credentials for Google/Apple/LinkedIn (same as web).
- **Push notifications**: see "Push notifications" above (Expo project, Firebase, migration).

## Structure

```
src/app/          Expo Router screens — (tabs) Home/Advocates/Messages/Learn/More, (auth) flows
src/features/     screen building blocks (home, workspaces per role, admin, content editor)
src/components/   design system (ui/), charts (charts/, drawn with react-native-svg) + shared
                  components
src/lib/          supabase, api, queries, session/roles, push, payments, documents, realtime;
                  *.web.ts files are the desktop counterparts (see "One codebase, three runtimes")
src/theme/        "Chambers" tokens (hex conversions of the web's OKLCH palette) + theme provider
plugins/          config plugins (release signing, short Windows native-build paths, optional
                  Firebase config for Android push)
```

## Security notes

- Only **public** content is persisted to disk for offline use; cases, messages, documents,
  payments and profiles stay in memory and are cleared on sign-out.
- Documents open through short-lived signed URLs; message pushes never include message text.
- Optional Face ID / fingerprint app lock (Settings → Security).
