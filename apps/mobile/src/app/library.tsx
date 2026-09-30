import { Redirect } from "expo-router";

export default function LibraryRedirect() {
  return <Redirect href={{ pathname: "/(tabs)/learn", params: { section: "library" } }} />;
}
