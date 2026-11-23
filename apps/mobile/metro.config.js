const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Expo Go: stub Clerk passkeys so the bundle never pulls Node `buffer` / native passkey code.
// Set EXPO_NO_PASSKEYS=0 (or omit for default) when bundling a dev client / EAS build that needs them.
const stubPasskeys = process.env.EXPO_NO_PASSKEYS !== "0";

if (stubPasskeys) {
  const empty = require.resolve("./src/lib/passkeys-stub.js");
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "@clerk/expo/passkeys" || moduleName === "@clerk/expo-passkeys") {
      return { filePath: empty, type: "sourceFile" };
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
