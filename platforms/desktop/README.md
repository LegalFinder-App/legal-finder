# Desktop (Windows, Linux, macOS)

LegalFinder ships as a desktop app via [Electron](https://www.electronjs.org). Like the mobile
apps, this is a thin shell (`electron/main.js`) — one window pointed at the real deployed web
app, not a separately bundled copy of the client. See `../README.md` for the full reasoning
(same-origin cookies for Clerk, one backend to maintain, this app is fundamentally networked
anyway so there's little to gain from an offline-capable bundle).

Electron was chosen over Tauri specifically because Tauri renders through the OS's native
webview — WKWebView (Safari's engine) on macOS — and this project already spent real effort
debugging Clerk session-timing issues in a plain browser. Electron bundles one consistent
Chromium on every OS, which avoids reintroducing that class of bug on desktop. Trade-off: a
larger install size (~100–150MB baseline) than Tauri would produce.

## One-time setup

Before packaging a real build, open `electron/main.js` and replace `PRODUCTION_APP_URL` with
your actual deployed URL. Unlike the mobile config (which reads `VITE_APP_URL` at sync time),
Electron ships the JS file as-is — a packaged, distributed app has no `.env` file on the end
user's machine to read from, so the URL has to be baked in as a literal constant. Setting
`VITE_APP_URL` in your shell only affects `npm run desktop:dev` (local testing).

Desktop icons need no separate generation step: `electron-builder.yml` points directly at
`platforms/shared/icons/source-icon.png` (regenerate that file with `npm run icons:generate` if
`public/legalfinder-logo.png` ever changes) and `electron-builder` converts that single
1024×1024 PNG into the per-OS `.ico`/`.icns` formats automatically at build time.

## Windows (buildable and runnable on this machine)

```
npm run desktop:dev          # launch Electron pointed at VITE_APP_URL (or localhost:3000) for quick iteration
npm run desktop:dist:win     # produces an NSIS installer at platforms/desktop/release/
```

## Linux (buildable here, not launchable/testable here)

```
npm run desktop:dist:linux   # produces an AppImage and a .deb at platforms/desktop/release/
```
Electron ships prebuilt Linux binaries, so `electron-builder` can package this from Windows
without needing a Linux machine — but there's no way to actually launch/verify the result here.
Test it on a real Linux machine (or a VM) before distributing.

## macOS (cannot be built here — see `macos/README.md`)

`electron-builder` can only produce a macOS dmg/pkg when actually running on macOS — there is no
cross-build path from Windows or Linux, signing included. Use `.github/workflows/desktop-macos-build.yml`
(GitHub's hosted macOS runners) or a real Mac. See `macos/README.md` for the exact steps and the
notarization secrets needed for a signed, distributable build.
