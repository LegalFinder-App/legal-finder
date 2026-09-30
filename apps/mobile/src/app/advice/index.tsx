import { Redirect } from "expo-router";

// Deep links to /advice (e.g. from the assistant or a notification) land on the Learn tab.
export default function AdviceIndex() {
  return <Redirect href="/(tabs)/learn" />;
}
