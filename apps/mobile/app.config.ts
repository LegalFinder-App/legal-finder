import type { ExpoConfig } from "expo/config";

// Same package/bundle id as the old Capacitor wrapper, so this native app ships as an *update* to
// the existing Play listing (and future App Store listing) rather than a new app. versionCode
// must stay above the wrapper's last upload (4).
const VERSION = "2.0.0";
const ANDROID_VERSION_CODE = 5;
const IOS_BUILD_NUMBER = "1";

const config: ExpoConfig = {
  name: "LegalFinder",
  slug: "legalfinder",
  scheme: "legalfinder",
  version: VERSION,
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  backgroundColor: "#fcfaf6",
  ios: {
    bundleIdentifier: "com.legalfinder.app",
    buildNumber: IOS_BUILD_NUMBER,
    supportsTablet: true,
    usesAppleSignIn: true,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSFaceIDUsageDescription:
        "LegalFinder uses Face ID to unlock the app and keep your case files private.",
      NSPhotoLibraryUsageDescription: "Choose a profile photo or attach images to your matters.",
      NSCameraUsageDescription: "Take a profile photo or capture a document for your matter.",
    },
  },
  android: {
    package: "com.legalfinder.app",
    versionCode: ANDROID_VERSION_CODE,
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
      backgroundColor: "#ffffff",
    },
    // Only what the app uses; expo-notifications adds POST_NOTIFICATIONS itself.
    permissions: ["USE_BIOMETRIC", "USE_FINGERPRINT"],
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.SYSTEM_ALERT_WINDOW",
    ],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    "expo-router",
    "@clerk/expo",
    "expo-secure-store",
    "expo-font",
    "expo-web-browser",
    "expo-image",
    "expo-sharing",
    "expo-apple-authentication",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 160,
        resizeMode: "contain",
        backgroundColor: "#0b182b",
        dark: { image: "./assets/splash-icon.png", backgroundColor: "#040913" },
      },
    ],
    [
      "expo-notifications",
      { icon: "./assets/notification-icon.png", color: "#bb8739", defaultChannel: "default" },
    ],
    [
      "expo-local-authentication",
      {
        faceIDPermission:
          "LegalFinder uses Face ID to unlock the app and keep your case files private.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Choose a profile photo or attach images to your matters.",
        cameraPermission: "Take a profile photo or capture a document for your matter.",
      },
    ],
    ["expo-document-picker", { iCloudContainerEnvironment: "Production" }],
    "@react-native-community/datetimepicker",
    "./plugins/withReleaseSigning",
    "./plugins/withShortNativeBuildPaths",
  ],
  experiments: { typedRoutes: true },
  extra: {
    router: {},
    // Set EAS_PROJECT_ID after `npx eas-cli@latest init` — push notifications need it.
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
  owner: process.env.EXPO_OWNER,
};

export default config;
