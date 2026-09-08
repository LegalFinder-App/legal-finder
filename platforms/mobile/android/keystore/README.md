# Release keystore

`legalfinder-release.keystore` is the signing key Google Play uses to verify every future update
to this app comes from you. **If this file or its password is lost, you can never publish an
update to the same Play Store listing again — you'd have to create a new app with a new
package name and lose all reviews/installs.**

This file (and `../keystore.properties`, which holds its password) is gitignored on purpose —
never commit either of them. Back up `legalfinder-release.keystore` and the password from
`../keystore.properties` somewhere durable and outside this repo right now (password manager +
an offline copy of the `.keystore` file — a USB drive or encrypted cloud folder). The password
was shown once, in the terminal output, when the keystore was generated via:

```
keytool -genkeypair -v -keystore legalfinder-release.keystore -alias legalfinder \
  -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=LegalFinder, OU=Engineering, O=LegalFinder, L=Unknown, ST=Unknown, C=US"
```

`../app/build.gradle` reads `../keystore.properties` automatically and signs release builds with
it whenever that file is present — `./gradlew bundleRelease` (from `platforms/mobile/android/`)
produces a signed `.aab` ready to upload to Play Console. If `keystore.properties` is missing
(e.g. on a fresh clone that hasn't restored the backup), release builds still compile, just
unsigned — Gradle won't fail the build, but Play Console will reject an unsigned upload.
