import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ArrowRight,
  BookOpen,
  Gavel,
  Library,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react-native";
import type { ComponentType } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { gradients } from "@/theme/tokens";
import { Button, Card, LoadingRows, SectionTitle, Text } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { ScreenStatusBar } from "@/components/ScreenStatusBar";
import { LawyerCard } from "@/components/LawyerCard";
import { adviceListQuery, publicLawyersQuery, quotesQuery } from "@/lib/queries";

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
  const lawyers = useQuery(publicLawyersQuery());
  const advice = useQuery(adviceListQuery);
  const quotes = useQuery(quotesQuery);
  const quote = quotes.data?.[0];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <ScreenStatusBar style="light" />
      <LinearGradient
        colors={[...(scheme === "dark" ? gradients.inkDark : gradients.inkLight)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <Logo onInk />
        <Text variant="eyebrow" tone="brass" style={{ marginTop: 28 }}>
          Justice, within reach
        </Text>
        <Text variant="display" tone="inkForeground" style={{ marginTop: 8 }}>
          Find the right advocate.
        </Text>
        <Text variant="display" tone="brass">
          Follow your case to the end.
        </Text>
        <Text tone="inkForeground" style={{ opacity: 0.75, marginTop: 12 }}>
          Clients, advocates, police services and the judiciary — on one platform.
        </Text>
        <View style={styles.heroActions}>
          <Button
            title="Browse advocates"
            onPress={() => router.push("/(tabs)/advocates")}
            iconRight={<ArrowRight size={16} color={colors.brassForeground} />}
          />
          <Button
            title="Sign in"
            variant="outline"
            onPress={() => router.push("/(auth)/sign-in")}
            style={{ borderColor: "rgba(255,255,255,0.25)" }}
          />
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text variant="eyebrow" tone="brass">
          What you can do
        </Text>
        <Text variant="h2" style={{ marginTop: 6 }}>
          Everything a legal matter needs
        </Text>
        <View style={styles.grid}>
          {PILLARS.map(({ icon: Icon, title, body, href }) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              accessibilityLabel={title}
              onPress={() => router.push(href as never)}
              style={({ pressed }) => [
                styles.pillar,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Icon size={20} color={colors.brass} />
              <Text variant="bodyStrong" style={{ marginTop: 10 }}>
                {title}
              </Text>
              <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
                {body}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle
          title="Advocates accepting clients"
          action={
            <Pressable accessibilityRole="link" onPress={() => router.push("/(tabs)/advocates")}>
              <Text variant="small" tone="brass">
                View all
              </Text>
            </Pressable>
          }
        />
        {lawyers.isLoading ? (
          <LoadingRows rows={1} height={150} />
        ) : (
          <FlatList
            horizontal
            data={(lawyers.data ?? []).filter((l) => l.accepting_clients).slice(0, 8)}
            keyExtractor={(l) => l.id}
            renderItem={({ item }) => <LawyerCard lawyer={item} compact />}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4, paddingRight: 20 }}
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle
          title="Plain-language guides"
          action={
            <Pressable accessibilityRole="link" onPress={() => router.push("/advice")}>
              <Text variant="small" tone="brass">
                All guides
              </Text>
            </Pressable>
          }
        />
        {(advice.data ?? []).slice(0, 3).map((item) => (
          <Card
            key={item.id}
            onPress={() => router.push(`/advice/${item.slug}`)}
            accessibilityLabel={item.title}
          >
            <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <BookOpen size={18} color={colors.brass} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{item.title}</Text>
                {item.summary ? (
                  <Text variant="small" tone="muted" numberOfLines={2} style={{ marginTop: 4 }}>
                    {item.summary}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        ))}
      </View>

      {quote ? (
        <View style={[styles.section, styles.quote, { borderLeftColor: colors.brass }]}>
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
  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  heroActions: { flexDirection: "row", gap: 10, marginTop: 20, flexWrap: "wrap" },
  section: { paddingHorizontal: 20, marginTop: 28, gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  pillar: {
    width: "48%",
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
  },
  quote: { borderLeftWidth: 3, paddingLeft: 16, marginHorizontal: 20, paddingHorizontal: 0 },
});
