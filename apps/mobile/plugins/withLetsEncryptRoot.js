// The app supports Android 7.0 (API 24), but only Android 7.1.1 and later trust ISRG Root X1, the
// root behind www.legalfinder.co's Let's Encrypt certificate (issued through Vercel). Without it a
// 7.0 phone can't reach the /api/mobile/* routes. This adds that one root, kept beside this file
// (isrg-root-x1.crt, SHA-256 96:BC:EC:06:…:BD:DF:08:C6, valid to 2035), as an extra trust anchor
// for release builds; the phone's own roots still apply. Debug builds are left alone, because a
// network security config would override their cleartext permission for the dev server.
const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config>
        <trust-anchors>
            <certificates src="system" />
            <certificates src="@raw/isrg_root_x1" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

const RELEASE_MANIFEST = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:networkSecurityConfig="@xml/network_security_config" />
</manifest>
`;

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

module.exports = function withLetsEncryptRoot(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const release = path.join(config.modRequest.platformProjectRoot, "app", "src", "release");
      write(
        path.join(release, "res", "raw", "isrg_root_x1.pem"),
        fs.readFileSync(path.join(__dirname, "isrg-root-x1.crt")),
      );
      write(
        path.join(release, "res", "xml", "network_security_config.xml"),
        NETWORK_SECURITY_CONFIG,
      );
      write(path.join(release, "AndroidManifest.xml"), RELEASE_MANIFEST);
      return config;
    },
  ]);
};
