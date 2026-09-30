import { Redirect } from "expo-router";

export default function JudgementsRedirect() {
  return <Redirect href={{ pathname: "/(tabs)/learn", params: { section: "judgements" } }} />;
}
