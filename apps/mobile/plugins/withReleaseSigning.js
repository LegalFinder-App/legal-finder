// Signs local Android release builds with the same upload key as the old Capacitor app, so this
// native app is accepted as an update to the existing Play listing. The generated android/ folder
// is recreated on every prebuild (Continuous Native Generation), hence a config plugin instead of
// a hand edit. Passwords are read from the gitignored keystore.properties at *build* time — they
// are never copied into generated files.
//
// Default location: ../../platforms/mobile/android/keystore.properties (override with
// LEGALFINDER_KEYSTORE_PROPERTIES). If it's missing, release builds fall back to the debug key and
// Play will reject the upload — which is the safe failure mode.
const path = require("node:path");
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// legalfinder-release-signing";

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (gradle.includes(MARKER)) return mod;

    const propsPath = path
      .resolve(
        process.env.LEGALFINDER_KEYSTORE_PROPERTIES ||
          path.join(__dirname, "..", "..", "..", "platforms", "mobile", "android", "keystore.properties"),
      )
      .replace(/\\/g, "/");

    const loader = `${MARKER}
def lfSigningPropsFile = new File("${propsPath}")
def lfSigningProps = new Properties()
def lfHasReleaseSigning = lfSigningPropsFile.exists()
if (lfHasReleaseSigning) {
    lfSigningPropsFile.withInputStream { lfSigningProps.load(it) }
}
`;
    gradle = gradle.replace(/^android\s*\{/m, `${loader}\nandroid {`);

    gradle = gradle.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        release {
            if (lfHasReleaseSigning) {
                // storeFile in keystore.properties is relative to the file's own folder.
                storeFile new File(lfSigningPropsFile.parentFile, lfSigningProps['storeFile'])
                storePassword lfSigningProps['storePassword']
                keyAlias lfSigningProps['keyAlias']
                keyPassword lfSigningProps['keyPassword']
            }
        }`,
    );

    // Point the release build type at it (the template ships release → debug signing).
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
      "$1signingConfig lfHasReleaseSigning ? signingConfigs.release : signingConfigs.debug",
    );

    mod.modResults.contents = gradle;
    return mod;
  });
};
