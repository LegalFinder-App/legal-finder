# macOS

**Cannot be built on Windows or Linux** — `electron-builder`'s dmg/pkg packaging (and all code
signing/notarization) only runs on actual macOS. Use a Mac, or
`.github/workflows/desktop-macos-build.yml` (GitHub's hosted macOS runners).

## On a Mac

```
npm run desktop:dist:mac
```
Produces a dmg and a zip at `platforms/desktop/release/`. Unsigned by default — Gatekeeper will
block it on another Mac with "cannot be opened because the developer cannot be verified" until
you sign and notarize it.

## Signing + notarization

Needs an Apple Developer Program membership ($99/yr) and a "Developer ID Application"
certificate (Xcode > Settings > Accounts > Manage Certificates, or the Apple Developer portal).
Set these environment variables before building (electron-builder picks them up automatically):

- `CSC_LINK` / `CSC_KEY_PASSWORD` — your exported `.p12` certificate (base64) and its password
- `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` — for notarization (Apple scans
  the build for malware and issues a ticket Gatekeeper checks); `hardenedRuntime: true` is
  already set in `../electron-builder.yml`, required for notarization to succeed.

The same variables, as GitHub repo secrets, are what `.github/workflows/desktop-macos-build.yml`
expects — see the comments in that file for the exact secret names.
