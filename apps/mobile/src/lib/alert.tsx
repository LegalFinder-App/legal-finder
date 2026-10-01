import { Alert } from "react-native";

// The native alert on phones. React Native's Alert does nothing outside iOS/Android, so the
// desktop build swaps in alert.web.tsx, which renders the same title/message/buttons as an in-app
// dialog through <AlertHost /> (mounted once in the root layout).
export const showAlert: typeof Alert.alert = (...args) => Alert.alert(...args);

export function AlertHost() {
  return null;
}
