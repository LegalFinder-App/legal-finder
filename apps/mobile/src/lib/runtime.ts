import Constants from "expo-constants";

/** True inside the Expo Go app (not a custom/dev/EAS build). */
export const isExpoGo = Constants.appOwnership === "expo";
