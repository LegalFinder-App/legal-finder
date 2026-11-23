import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "legalfinder.onboarding.v1";

/** First-launch walkthrough; bump the key suffix if the slides change enough to re-show. */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch {
    return false;
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "1");
  } catch {
    // Storage full / private mode — don't block entry.
  }
}
