# Linux

```
npm run desktop:dist:linux
```

Produces an AppImage and a `.deb` at `platforms/desktop/release/`. Electron ships prebuilt Linux
binaries, so this packages fine from Windows (or macOS) without a Linux machine — but that also
means the result has never been launched or tested. `.github/workflows/desktop-build.yml` builds
it on a real Linux runner. Before distributing:

- Test the AppImage on at least one real distro (`chmod +x LegalFinder-*.AppImage && ./LegalFinder-*.AppImage`).
- Test the `.deb` with `sudo dpkg -i LegalFinder-*.deb` on a Debian/Ubuntu-family system.
- Check the two things that depend on the desktop environment: that a `legalfinder://` link
  (after social sign-in or a payment) comes back to the app, and that the session survives a
  restart (it is stored through the system keyring — see `../README.md`).
- Consider adding a `snap`/`flatpak` target later if you want Linux app-store-style distribution
  — not scaffolded here since neither was requested.
