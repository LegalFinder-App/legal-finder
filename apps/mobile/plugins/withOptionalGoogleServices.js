// Android push goes through Firebase Cloud Messaging, which needs the Firebase project's
// google-services.json in apps/mobile/. It's optional: without it the app builds fine and hides its
// push controls (pushAvailable() in src/lib/push.ts reads this same setting at runtime). This plugin
// wires the file in only when it exists, so one config works before and after push is set up —
// see README "Push notifications".
/* global __dirname */
const fs = require("fs");
const path = require("path");

const FILE = "google-services.json";

module.exports = function withOptionalGoogleServices(config) {
  if (fs.existsSync(path.join(__dirname, "..", FILE))) {
    config.android = { ...config.android, googleServicesFile: `./${FILE}` };
  }
  return config;
};
