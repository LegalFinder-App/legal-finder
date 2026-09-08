# Linux

```
npm run desktop:dist:linux
```

Produces an AppImage and a `.deb` at `platforms/desktop/release/`. Electron ships prebuilt Linux
binaries, so this builds fine from Windows (or macOS) without needing a Linux machine — but that
also means the result has never been launched or tested here. Before distributing:

- Test the AppImage on at least one real distro (`chmod +x LegalFinder-*.AppImage && ./LegalFinder-*.AppImage`).
- Test the `.deb` with `sudo dpkg -i legalfinder-desktop_*.deb` on a Debian/Ubuntu-family system.
- Consider adding a `snap`/`flatpak` target later if you want Linux app-store-style distribution
  — not scaffolded here since neither was requested.
