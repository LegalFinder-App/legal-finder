import type { ExpoConfig } from "expo/config";

// Same package/bundle id as the old Capacitor wrapper, so this native app ships as an *update* to
// the existing Play listing (and future App Store listing) rather than a new app. versionCode
// must stay above the wrapper's last upload (4).
const VERSION = "2.0.0";
const ANDROID_VERSION_CODE = 13;
const IOS_BUILD_NUMBER = "6";

// The Expo (EAS) project these builds belong to — expo.dev/accounts/ochienodavid/projects/legalfinder,
// created by `eas init`. An identifier, not a secret: EAS Build refuses to run without it, and Expo
// push tokens are issued per project.
const EXPO_OWNER = "ochienodavid";
const EAS_PROJECT_ID = "3e51f2b9-07dc-4ca6-8644-68648a4eeb69";

// Push stays off in the app until everything behind it exists (README, "Push notifications"):
// with only the project id above, the switch would appear on iOS and fail when tapped.
const PUSH_ENABLED = false;

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
    // iPhone only for the first release. The layout is a phone layout (useWideLayout is desktop
    // only) and has never been run on an iPad, and iPad support needs its own App Store
    // screenshots. It can be switched on in a later version, but once a version ships with it
    // Apple does not allow removing it — so it stays off until it has been designed and tested.
    supportsTablet: false,
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
  // The desktop apps (Windows/macOS/Linux) package this web build inside an Electron shell —
  // platforms/desktop. One index.html: the shell serves it for every route.
  web: { bundler: "metro", output: "single" },
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
        // The app picks still images only. Without this the plugin adds a generic microphone
        // purpose string to the iOS app (and RECORD_AUDIO on Android) for video it never records.
        microphonePermission: false,
      },
    ],
    ["expo-document-picker", { iCloudContainerEnvironment: "Production" }],
    "@react-native-community/datetimepicker",
    "./plugins/withReleaseSigning",
    "./plugins/withShortNativeBuildPaths",
    "./plugins/withOptionalGoogleServices",
    "./plugins/withLetsEncryptRoot",
  ],
  experiments: { typedRoutes: true },
  extra: {
    router: {},
    eas: { projectId: EAS_PROJECT_ID },
    // Read by pushAvailable() in src/lib/push.ts.
    pushEnabled: PUSH_ENABLED,
  },
  owner: EXPO_OWNER,
};

export default config;
