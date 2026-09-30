import { useEffect } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/theme/ThemeProvider";
import { LoadingRows } from "@/components/ui";
import { env } from "@/lib/env";

// Terms and privacy stay single-sourced on the website (they're legal documents that change
// together); this route just opens the live page in the in-app browser and returns.
const PAGES: Record<string, string> = { terms: "/terms-of-service", privacy: "/privacy-policy" };

export default function LegalDocScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { colors } = useTheme();

  useEffect(() => {
    const path = PAGES[doc] ?? PAGES.terms;
    void WebBrowser.openBrowserAsync(`${env.apiUrl}${path}`, {
      toolbarColor: colors.background,
      controlsColor: colors.brass,
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    }).finally(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/more");
    });
  }, [doc, colors.background, colors.brass]);

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: colors.background }}>
      <LoadingRows rows={2} />
    </View>
  );
}
