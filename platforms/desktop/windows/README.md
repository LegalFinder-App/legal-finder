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
2. **The reliable fix** — pre-extract Electron yourself once, then point electron-builder at the
   already-unpacked folder so it never does the extract-then-rename dance that's racing Defender:
   ```
   # Find the cached zip (downloaded by your first build attempt, whichever failed):
   #   %LOCALAPPDATA%\electron\Cache\<hash>\electron-v<version>-win32-x64.zip
   powershell -Command "Expand-Archive -Path '<path to the zip above>' -DestinationPath '.electron-dist-win32-x64' -Force"
   npx electron-builder --config platforms/desktop/electron-builder.yml --win -c.electronDist=.electron-dist-win32-x64
   ```
   (`npm run desktop:dist:win:eperm-fix` does the same after exporting the app.)
   Confirmed working — this got past the rename step successfully after four consecutive
   plain-retry failures. `.electron-dist-win32-x64/` is gitignored; regenerate it (or bump the
   version in the path) whenever you upgrade the `electron` dependency.
3. Add a Defender exclusion for this repo folder (needs an elevated PowerShell prompt you
   approve interactively — running it from an unattended script doesn't work, since UAC needs a
   real click): `Add-MpPreference -ExclusionPath 'C:\path\to\this\repo'`.

Produces an NSIS installer at `platforms/desktop/release/` (`LegalFinder-<version>-win-x64.exe`).
Running the installer adds a desktop shortcut and Start Menu entry (see `nsis:` in
`../electron-builder.yml` — `oneClick: false` shows the standard install-location picker instead
of a silent one-click install).

The installer is unsigned by default. Windows SmartScreen will show an "unknown publisher"
warning until you sign the build with a code-signing certificate — set `CSC_LINK` /
`CSC_KEY_PASSWORD` (or `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD`) environment variables pointing at
your `.pfx` certificate before running the build; see
[electron-builder's Windows code signing docs](https://www.electron.build/docs/code-signing/).
