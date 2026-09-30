import { Redirect } from "expo-router";

export default function NewsIndex() {
  return <Redirect href={{ pathname: "/(tabs)/learn", params: { section: "news" } }} />;
}
