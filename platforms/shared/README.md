# Shared

The one thing every platform target actually shares.

- **`icons/source-icon.png`** — canonical 1024×1024 icon source, generated from
  `public/legalfinder-logo.png` via `npm run icons:generate`. Every platform's own icon tooling
  reads from here (or a copy of it — see `../mobile/assets/logo.png`, which
  `@capacitor/assets` requires in its own conventional location) rather than each platform
  keeping a separately-maintained icon.
- **`VITE_APP_URL`** — the one config value that turns the shared web app into a mobile/desktop
  wrapper. Not a file here, but the single source of truth every `capacitor.config.ts` and
  `electron/main.js` reads (see `../README.md` for how each one uses it — mobile bakes it in at
  `cap sync` time, desktop needs it hardcoded into `main.js` before a real distributed build).

There's no shared *code* between platforms beyond this — by design. Every platform loads the same
running web app (`src/`) directly; none of them bundle a copy of it, so there's nothing else to
keep in sync.
