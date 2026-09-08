# Windows

Buildable and runnable directly from a Windows machine.

```
npm run desktop:dist:win
```

**If this fails with `EPERM: operation not permitted, rename '...win-unpacked.tmp' -> '...win-unpacked'`**:
this is a well-documented electron-builder-on-Windows issue, almost always Windows Defender's
real-time scanner briefly locking the just-extracted `.exe`/`.dll` files before electron-builder
can rename the folder. It's not a problem with this project's config — everything up to that
point (icon generation, native module rebuild, Electron binary download, file extraction) is
unaffected. Fixes, in order of effort:
1. Just run the command again — it's a race condition and sometimes clears on a retry.
2. Add a Defender exclusion for this repo folder (needs an elevated PowerShell prompt you
   approve interactively — running it from an unattended script doesn't work, since UAC needs a
   real click): `Add-MpPreference -ExclusionPath 'C:\path\to\this\repo'`.
3. Temporarily pause real-time protection for the duration of the build.

Produces an NSIS installer at `platforms/desktop/release/` (e.g. `LegalFinder Setup 0.1.0.exe`).
Running the installer adds a desktop shortcut and Start Menu entry (see `nsis:` in
`../electron-builder.yml` — `oneClick: false` shows the standard install-location picker instead
of a silent one-click install).

The installer is unsigned by default. Windows SmartScreen will show an "unknown publisher"
warning until you sign the build with a code-signing certificate — set `CSC_LINK` /
`CSC_KEY_PASSWORD` (or `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD`) environment variables pointing at
your `.pfx` certificate before running the build; see
[electron-builder's Windows code signing docs](https://www.electron.build/docs/code-signing/).
