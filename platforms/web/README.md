# Web

This is the actual product — everything in `src/` — deployed as a TanStack Start app on Vercel.
Every other platform folder (`../mobile`, `../desktop`) wraps this same deployment; none of them
build or ship a separate copy of it.

- **Deployment config**: `vercel.json` (security headers, framework detection) at the repo root.
- **Build gate**: `scripts/verify-vercel-env.mjs` runs as the `prebuild` script and fails the
  build (when `VERCEL=1`) if `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_CLERK_PUBLISHABLE_KEY`, or `CLERK_SECRET_KEY` are missing.
- **Installable as a PWA**: `public/manifest.webmanifest` + `public/sw.js` — Chrome/Edge/Android
  already offer an install prompt for this today, no extra work needed. The PWA icon set lives at
  `public/icons/` (`npm run icons:generate` regenerates it from `public/legalfinder-logo.png`,
  the same source every other platform's icons come from — see `../shared/README.md`).

Nothing in this folder is new scaffolding — it's here so the platform matrix in `../README.md`
has a home for "what does the web deliverable actually consist of," alongside the mobile and
desktop wrappers.
