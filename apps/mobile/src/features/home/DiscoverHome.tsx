import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ChevronRight,
  Gavel,
  Library,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react-native";
import type { ComponentType } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, gradients } from "@/theme/tokens";
import { Button, Text } from "@/components/ui";
import { useWideLayout } from "@/lib/layout";
import { ScreenStatusBar } from "@/components/ScreenStatusBar";
import { quotesQuery } from "@/lib/queries";

// The signed-out home: a welcome screen, not the website's landing page. The tab bar only
// appears once someone signs in ((tabs)/_layout.tsx), so these cards are the way in.

type Pillar = {
  icon: ComponentType<{ size?: number; color?: string }>;
  title: string;
  body: string;
  href: string;
};

// The web homepage's PILLARS, pointing at their native screens.
const PILLARS: Pillar[] = [
  {
    icon: Users,
    title: "Verified advocates",
    body: "Checked against the Uganda Law Council roll.",
    href: "/(tabs)/advocates",
  },
  {
    icon: ScrollText,
    title: "Case tracking",
    body: "Hearings, notes and documents in one place.",
    href: "/cases",
  },
  {
    icon: Gavel,
    title: "Court judgements",
    body: "Search decisions by court, judge or number.",
    href: "/judgements",
  },
  {
    icon: ShieldAlert,
    title: "Report an incident",
    body: "File with police, anonymously if needed.",
    href: "/report",
  },
  {
    icon: Library,
    title: "E-library & advice",
    body: "Plain-language guides and statutes.",
    href: "/(tabs)/learn",
  },
  {
    icon: Sparkles,
    title: "AI legal assistant",
    body: "Understand your options in minutes.",
    href: "/assistant",
  },
];

export function DiscoverHome() {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const wide = useWideLayout();
  const quotes = useQuery(quotesQuery);
  const quote = quotes.data?.[0];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
    >
      <ScreenStatusBar style="light" />
      <LinearGradient
        colors={[...(scheme === "dark" ? gradients.inkDark : gradients.inkLight)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, wide ? styles.wideHeader : { paddingTop: insets.top + 36 }]}
      >
        {/* The LegalFinder seal, as on the app icon, in a brass ring. */}
        <View style={[styles.sealRing, { borderColor: `${colors.brass}8c` }]}>
          <Image
            source={require("../../../assets/splash-icon.png")}
            style={styles.seal}
            contentFit="contain"
            accessibilityLabel="LegalFinder seal"
          />
        </View>
        <Text style={styles.wordmark} accessibilityRole="header">
          <Text style={[styles.wordmark, { color: colors.inkForeground }]}>Legal</Text>
          <Text style={[styles.wordmark, { color: colors.brass }]}>Finder</Text>
        </Text>
        <View style={[styles.rule, { backgroundColor: colors.brass }]} />
        <Text variant="eyebrow" tone="brass" style={{ textAlign: "center" }}>
          Justice, within reach
        </Text>
        <Text tone="inkForeground" style={styles.tagline}>
          Verified advocates, your cases and the courts — in one place.
        </Text>
        <View style={[styles.actions, wide && styles.wideActions]}>
          <Button
            title="Create account"
            onPress={() => router.push("/(auth)/sign-up")}
            style={{ flex: 1 }}
          />
          <Button
            title="Sign in"
            variant="inkOutline"
            onPress={() => router.push("/(auth)/sign-in")}
            style={{ flex: 1 }}
          />
        </View>
      </LinearGradient>

      <View style={[styles.section, wide && styles.wideSection]}>
        <Text variant="eyebrow" tone="brass">
          What you can do
        </Text>
        <Text variant="h2" style={{ marginTop: 4 }}>
          Everything a legal matter needs
        </Text>
        <View style={styles.grid}>
          {PILLARS.map(({ icon: Icon, title, body, href }) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              accessibilityLabel={title}
              accessibilityHint={body}
              onPress={() => router.push(href as never)}
              style={({ pressed }) => [
                styles.pillar,
                wide && styles.widePillar,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={styles.pillarTop}>
                <View style={[styles.iconTile, { backgroundColor: colors.accent }]}>
                  <Icon size={20} color={colors.brass} />
                </View>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </View>
              <Text variant="bodyStrong" style={{ marginTop: 12 }}>
                {title}
              </Text>
              <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
                {body}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {quote ? (
        <View
          style={[
            styles.section,
            styles.quote,
            wide && styles.wideQuote,
            { borderLeftColor: colors.brass },
          ]}
        >
          <Text variant="h3" style={{ fontStyle: "italic" }}>
            “{quote.text}”
          </Text>
          {quote.author ? (
            <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
              — {quote.author}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  sealRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  seal: { width: 96, height: 96, borderRadius: 48 },
  wordmark: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, marginTop: 14 },
  rule: { width: 36, height: 2, borderRadius: 1, marginTop: 10, marginBottom: 12 },
  tagline: { textAlign: "center", opacity: 0.78, marginTop: 6, maxWidth: 320 },
  actions: { flexDirection: "row", gap: 10, marginTop: 22, alignSelf: "stretch" },
  section: { paddingHorizontal: 20, marginTop: 26, gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  pillar: {
    width: "47%",
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
  },
  pillarTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quote: { borderLeftWidth: 3, paddingLeft: 16, marginHorizontal: 20, paddingHorizontal: 0 },
  // Wide desktop window: the header stays a centred block and sections keep a comfortable
  // measure instead of running edge to edge.
  wideHeader: {
    paddingTop: 48,
    paddingBottom: 40,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  wideActions: { alignSelf: "center", width: 360 },
  wideSection: { paddingHorizontal: 48, maxWidth: 1120 },
  widePillar: { width: "31%" },
  wideQuote: { marginHorizontal: 48, maxWidth: 1024 },
});
