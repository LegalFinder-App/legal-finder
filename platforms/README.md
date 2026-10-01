# LegalFinder platform matrix

One product on six targets, from two client codebases and one backend:

- the **website** — `src/`, TanStack Start on Vercel. It is also the backend for every app
  (`/api/mobile/*`, payment callbacks, webhooks).
- the **app** — `apps/mobile`, Expo / React Native. It ships as the Android and iOS apps and,
  exported for the web, as the code inside the Windows, macOS and Linux apps.

| Target  | What ships                                   | Built from                              | Buildable on the dev machine?                          |
| ------- | -------------------------------------------- | --------------------------------------- | ------------------------------------------------------ |
| Web     | The website (installable as a PWA)           | `src/` → Vercel                         | Yes                                                    |
| Android | Native app                                   | `apps/mobile`                           | Yes — see `apps/mobile/README.md`                      |
| iOS     | Native app                                   | `apps/mobile`                           | **No** — EAS cloud build, or a Mac                     |
| Windows | Desktop app (Electron shell + the app's code) | `apps/mobile` export + `desktop/`       | Yes                                                    |
| Linux   | Same                                         | Same                                    | Packages from Windows, but can't be run or tested here |
| macOS   | Same                                         | Same                                    | **No** — needs macOS; `.github/workflows/desktop-build.yml` |

## Nothing here is a wrapper around the website

The phone and desktop apps used to be thin shells — Capacitor on phones, an Electron window on
desktop — that loaded the deployed site. That is gone:

- **Phones** run a native React Native app.
- **Desktop** runs the same app code, exported with `expo export --platform web` and packaged
  _inside_ the installer. The shell serves it from disk through an `app://` scheme and never loads
  the website. It still draws its screens with a browser engine (Electron's Chromium), as VS Code
  and Slack do; what changed is that the program is self-contained.

The old shells existed because Clerk's browser sessions are cookies on the site's own domain, which
a page served from anywhere else can't use. The apps avoid the problem instead of working around
it: they run Clerk in its token-based "native" mode, exactly like the phone apps. See
`desktop/README.md` for how the desktop shell supports that.

## Structure

- **`web/`** — what the web deliverable consists of (documentation only; the code is `src/`).
- **`desktop/`** — the Electron shell (`electron/main.js`, `electron/preload.js`), packaging config
  and per-OS build notes.
- **`mobile/`** — the superseded Capacitor wrapper, kept for reference. Two things in it are still
  live: `store-assets/` (Play Console graphics) and `android/keystore.properties` (gitignored — the
  Play upload key the native app also signs with). Don't upload its builds.
- **`shared/`** — the icon source every platform is generated from.
