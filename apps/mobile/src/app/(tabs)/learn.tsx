import { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink, FileDown, Gavel, Library, Newspaper } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingRows,
  Segmented,
  Tag,
  Text,
} from "@/components/ui";
import { openLink } from "@/components/Markdown";
import { adviceListQuery, judgementsQuery, libraryQuery, newsListQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";

type Section = "guides" | "judgements" | "library" | "news";

type Item = {
  id: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  body?: string | null;
  tag?: string | null;
  onPress?: () => void;
  file?: string | null;
};

const SECTIONS: { value: Section; label: string }[] = [
  { value: "guides", label: "Guides" },
  { value: "judgements", label: "Judgements" },
  { value: "library", label: "Library" },
  { value: "news", label: "News" },
];

const INTRO: Record<Section, string> = {
  guides:
    "Written and reviewed by practising advocates so you know your options before you spend a shilling.",
  judgements:
    "Reported decisions, searchable by court, judge and case number. Verify official text on ULII before relying on it.",
  library: "Constitutions, statutes, procedure rules and practice manuals — free to read.",
  news: "Rulings, legislation and justice-sector news.",
};

export default function LearnTab() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ section?: string }>();
  const fromParams = SECTIONS.find((s) => s.value === params.section)?.value;
  const [section, setSection] = useState<Section>(fromParams ?? "guides");
  // A new deep link (e.g. /judgements) re-selects its section; adjusted during render per React's
  // "storing information from previous renders" pattern instead of a syncing effect.
  const [lastParam, setLastParam] = useState(params.section);
  if (params.section !== lastParam) {
    setLastParam(params.section);
    if (fromParams) setSection(fromParams);
  }
  const [q, setQ] = useState("");
  const advice = useQuery({ ...adviceListQuery, enabled: section === "guides" });
  const judgements = useQuery({ ...judgementsQuery, enabled: section === "judgements" });
  const library = useQuery({ ...libraryQuery, enabled: section === "library" });
  const news = useQuery({ ...newsListQuery, enabled: section === "news" });
  const active = { guides: advice, judgements, library, news }[section];

  const items: Item[] = useMemo(() => {
    switch (section) {
      case "guides":
        return (advice.data ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          body: a.summary,
          tag: a.category,
          meta: a.author_name ?? "LegalFinder Editorial",
          onPress: () => router.push(`/advice/${a.slug}`),
        }));
      case "judgements":
        return (judgements.data ?? []).map((j) => ({
          id: j.id,
          title: j.title,
          subtitle: [j.court, j.judge ? `Before ${j.judge}` : null].filter(Boolean).join(" · "),
          meta: `${j.case_number}${j.decided_on ? ` · ${formatDate(j.decided_on)}` : ""}`,
          body: j.summary,
          file: j.file_url,
        }));
      case "library":
        return (library.data ?? []).map((l) => ({
          id: l.id,
          title: l.title,
          subtitle: [l.author, l.year].filter(Boolean).join(" · "),
          tag: l.category,
          body: l.description,
          file: l.file_url,
        }));
      case "news":
        return (news.data ?? []).map((n) => ({
          id: n.id,
          title: n.title,
          body: n.summary,
          meta: [n.source, n.published_at ? formatDate(n.published_at) : null]
            .filter(Boolean)
            .join(" · "),
          onPress: () => router.push(`/news/${n.slug}`),
        }));
    }
  }, [section, advice.data, judgements.data, library.data, news.data]);

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? items.filter((i) =>
        [i.title, i.subtitle, i.meta, i.body, i.tag].some((f) => f?.toLowerCase().includes(needle)),
      )
    : items;

  const Icon = { guides: BookOpen, judgements: Gavel, library: Library, news: Newspaper }[section];

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={active.isLoading || active.isError ? [] : filtered}
      keyExtractor={(i) => i.id}
      keyboardShouldPersistTaps="handled"
      refreshing={active.isRefetching}
      onRefresh={() => void active.refetch()}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Segmented
            options={SECTIONS}
            value={section}
            onChange={(s) => {
              setSection(s);
              setQ("");
            }}
          />
          <Text variant="small" tone="muted">
            {INTRO[section]}
          </Text>
          <Input
            value={q}
            onChangeText={setQ}
            placeholder={`Search ${section}`}
            returnKeyType="search"
            accessibilityLabel={`Search ${section}`}
          />
        </View>
      }
      renderItem={({ item }) => (
        <Card onPress={item.onPress} accessibilityLabel={item.title}>
          {item.meta ? (
            <Text variant="mono" tone="brass">
              {item.meta}
            </Text>
          ) : null}
          <Text variant="h3" style={{ marginTop: item.meta ? 4 : 0 }}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
              {item.subtitle}
            </Text>
          ) : null}
          {item.body ? (
            <Text variant="small" tone="muted" numberOfLines={4} style={{ marginTop: 8 }}>
              {item.body}
            </Text>
          ) : null}
          <View style={styles.footer}>
            {item.tag ? <Tag label={item.tag} /> : <View />}
            {item.file ? (
              <Button
                title={section === "judgements" ? "Full text" : "Open"}
                variant="ghost"
                size="sm"
                icon={
                  section === "judgements" ? (
                    <FileDown size={14} color={colors.brass} />
                  ) : (
                    <ExternalLink size={14} color={colors.brass} />
                  )
                }
                onPress={() => openLink(item.file!)}
              />
            ) : null}
          </View>
        </Card>
      )}
      ListEmptyComponent={
        active.isLoading ? (
          <LoadingRows rows={4} height={120} />
        ) : active.isError ? (
          <ErrorState
            message={(active.error as Error).message}
            onRetry={() => void active.refetch()}
          />
        ) : (
          <EmptyState
            icon={<Icon size={22} color={colors.brass} />}
            title={needle ? "Nothing matches your search" : "Nothing here yet"}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 48 },
  header: { gap: 12, marginBottom: 16 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
});
