# LegalFinder Platform Matrix

One product (`src/`, deployed once to Vercel), wrapped for every store and desktop OS. Every
wrapper below is a **thin shell**: it loads the real deployed site directly rather than bundling
a separate copy of the client. That one decision is what keeps this whole matrix simple — there's
exactly one backend, one auth flow, one place a bug gets fixed.

| Target | Tech | Buildable from this repo's dev machine? |
|---|---|---|
| Web / PWA | `src/` → Vercel (already deployed) | Yes |
| Android | Capacitor → `mobile/android/` | Yes (Android SDK required) |
| iOS | Capacitor → `mobile/ios/` | **No — needs a Mac.** See `.github/workflows/mobile-ios-build.yml` |
| Windows | Electron → `desktop/electron/` | Yes |
| Linux | Electron | Artifact builds, but can't be launched/tested without a Linux machine |
| macOS | Electron | **No — needs a Mac.** See `.github/workflows/desktop-macos-build.yml` |

## Why thin shells, not bundled clients

Clerk's session cookies and Supabase's realtime auth both work exactly like a normal browser tab
this way, because the WebView/BrowserWindow's origin *is* the real production origin — not a
`capacitor://` or `file://` scheme talking cross-origin to an API. Bundling a static copy of the
client would reintroduce third-party-cookie problems this project already spent real effort
solving once (see the Clerk migration in git history). The cost is that every platform needs
internet access to do anything — acceptable for an app whose entire feature set (auth, realtime
messaging, payments, an AI assistant) is already fundamentally networked.

## Structure

- **`web/`** — what the web deliverable consists of (points back at `vercel.json` etc. — no new
  code, this folder is documentation only).
- **`mobile/`** — Capacitor project (`capacitor.config.ts`, generated `android/` and `ios/`
  native projects, store submission checklist, the one known gap: iOS native push isn't wired up
  yet).
- **`desktop/`** — Electron project (`electron/main.js`, `electron-builder.yml`, per-OS build
  notes and signing requirements).
- **`shared/`** — the one config value (`VITE_APP_URL`) and the one icon source every platform
  reads from.

## Known, honest risk worth reading before submitting to the App Store

Apple's App Store Review Guideline 4.7.1 disfavors apps that are pure web wrappers with no native
behavior. Shipping successfully this way in practice is well documented in the Capacitor
community, but it's a calculated risk, not a guarantee — a proper splash screen, hidden browser
chrome, and the offline fallback page (`mobile/www/offline.html`) all help, but a fuller
native-navigation shell would be the real fix if a submission gets rejected on these grounds.
