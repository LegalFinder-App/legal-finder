# Desktop (Windows, macOS, Linux)

The desktop app is an [Electron](https://www.electronjs.org) shell around the app's own code. That
code is `apps/mobile` — the same screens as Android and iOS — exported for the web and copied into
the installer. The shell serves it from disk through `app://legalfinder/`; it never loads the
website. (`../README.md` has the reasoning.)

```
platforms/desktop/
  electron/main.js      the shell: window, app:// file server, bridge, deep links
  electron/preload.js   the bridge the page sees (window.legalfinderDesktop)
  electron-builder.yml  packaging for all three OSes
  windows/ macos/ linux/ per-OS build and signing notes
```

The app's side of the bridge is `apps/mobile/src/lib/desktop.ts`. Keep it and `preload.js` in step.

## What the shell does for the app

A page served from `app://` can't do three things for itself, so the shell does them — and
`main.js` checks every call (only from the app's own page, only for the purposes below):

- **Requests to two hosts.** Clerk's API and the website's `/api/mobile/*` routes don't send CORS
  headers for an `app://` origin (phones don't need them). The page asks the shell to make those
  requests; the shell refuses any other host.
- **Keeping the session.** Clerk runs in its token-based "native" mode, as on phones. The token is
  stored in `secure-store.json` in the app's data folder, encrypted with the OS keychain
  (Electron `safeStorage`: DPAPI on Windows, Keychain on macOS, libsecret/kwallet on Linux — on a
  Linux system with no keyring it is only obfuscated, the same limitation Chromium has).
- **Leaving for the browser and coming back.** Google/Apple/LinkedIn sign-in and Pesapal checkout
  open in the user's own browser and end on a `legalfinder://` link, which the OS hands back to the
  app (single-instance; the scheme is registered by the installers and at first run).

Everything else is ordinary web platform: Supabase and ImageKit are reached directly. The page
runs sandboxed with context isolation, a strict content security policy, no permissions beyond
clipboard and notifications, and no navigation away from the app — external links open in the
browser.

## Running it

```
npm run desktop:web     # export the app to apps/mobile/dist/desktop (needed before the next line)
npm run desktop:dev     # run the shell against that export
```

For work on the app itself, serve it from the dev server instead of re-exporting each time (the
window still runs under `app://legalfinder`, so sign-in and storage behave as in a real build):

```
cd apps/mobile && npx expo start --port 8082
LEGALFINDER_DEV_SERVER=http://localhost:8082 npm run desktop:dev
```

Don't run an export while that dev server is up — the two share a cache and the server can hang.

Other switches, all ignored by packaged builds except the first:

| Variable                           | Effect                                                               |
| ---------------------------------- | -------------------------------------------------------------------- |
| `LEGALFINDER_USER_DATA=<folder>`   | Use a separate data folder (a throwaway profile).                     |
| `LEGALFINDER_TEST_MODE=1`          | Record browser opens and downloads instead of performing them.       |
| `LEGALFINDER_REGISTER_PROTOCOL=1`  | Point this machine's `legalfinder://` links at the dev checkout.     |
| `LEGALFINDER_CLERK_ORIGIN` / `LEGALFINDER_API_ORIGIN` | Allow a development Clerk instance / a preview deployment. |

## Building installers

```
npm run desktop:dist:win     # NSIS installer      → release/LegalFinder-<version>-win-x64.exe
npm run desktop:dist:linux   # AppImage and .deb   → release/
npm run desktop:dist:mac     # dmg and zip — only on macOS
```

Each script exports the app first, then packages it. `.github/workflows/desktop-build.yml` builds
all three on GitHub's runners (the only way to get a macOS build without a Mac). The version comes
from `electron/package.json` — keep it in step with `apps/mobile/app.config.ts`.

Installers are **unsigned** until certificates are configured: Windows SmartScreen and macOS
Gatekeeper will warn. See `windows/README.md` and `macos/README.md`.

## Releasing an update

The app's code is inside the installer, so a change to `apps/mobile` reaches desktop users only
through a new installer — there is no auto-update yet. Bump the version, rebuild, redistribute.

## Verified / not verified

Verified on Windows, against the production backend, by driving the real window: sign-in with
password and authenticator code, two-step setup, session restored after restart, sign-out, the
browser hand-off and return link, document upload and save, account deletion, and the packaged
`LegalFinder.exe`. **Not** verified: macOS and Linux builds (never run), and a real Google/Apple/
LinkedIn or Pesapal round trip (they need a person in a browser).
