import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BookOpen, ExternalLink, Filter, Search } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius } from "@/theme/tokens";
import { Button, Chip, Segmented, SelectField, Text } from "@/components/ui";
import { Sheet } from "@/components/ui/Sheet";
import { api, type AssistantSource } from "@/lib/api";
import { errorMessage } from "@/lib/toast";

type SourceKind = AssistantSource["kind"];

type ResearchFilters = {
  kinds: SourceKind[];
  court: string | null;
  category: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

type ResearchFacets = {
  courts: string[];
  categories: string[];
  counts: Record<SourceKind, number>;
};

type HistoryEntry = {
  id: string;
  query: string;
  filters: ResearchFilters;
  resultCount: number;
  at: string;
};

const DEFAULT_FILTERS: ResearchFilters = {
  kinds: ["advice", "judgment", "library", "news"],
  court: null,
  category: null,
  dateFrom: null,
  dateTo: null,
};

const KIND_OPTIONS: { value: SourceKind; label: string }[] = [
  { value: "judgment", label: "Judgments" },
  { value: "library", label: "Library" },
  { value: "advice", label: "Guides" },
  { value: "news", label: "Headlines" },
];

const HISTORY_KEY = "legalfinder.counsellor.research.v1.mobile";

function emptyFacets(): ResearchFacets {
  return {
    courts: [],
    categories: [],
    counts: { advice: 0, judgment: 0, library: 0, news: 0 },
  };
}

function authorityLabel(authority: AssistantSource["authority"]) {
  if (authority === "judgment") return "Court judgment";
  if (authority === "legislation") return "Legislation";
  if (authority === "editorial") return "LegalFinder guide";
  if (authority === "news") return "Official headline";
  return "Library";
}

function authorityTint(
  authority: AssistantSource["authority"],
  colors: { brass: string; success: string; mutedForeground: string },
) {
  if (authority === "judgment") return colors.brass;
  if (authority === "legislation") return "#3b82f6";
  if (authority === "news") return colors.success;
  return colors.mutedForeground;
}

export function CounsellorResearch({
  onAskAboutSource,
  onUseInChat,
  onOpenSource,
  seededQuery = "",
}: {
  onAskAboutSource: (source: AssistantSource) => void;
  onUseInChat: (query: string) => void;
  onOpenSource: (source: AssistantSource) => void;
  seededQuery?: string;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState(seededQuery);
  const [filters, setFilters] = useState<ResearchFilters>(DEFAULT_FILTERS);
  const [facets, setFacets] = useState<ResearchFacets>(emptyFacets());
  const [sources, setSources] = useState<AssistantSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AssistantSource | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pane, setPane] = useState<"results" | "preview">("results");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(HISTORY_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as HistoryEntry[];
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, 20));
      } catch {
        // ignore corrupt cache
      }
    });
  }, []);

  const persistHistory = (entries: HistoryEntry[]) => {
    setHistory(entries);
    void AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 20)));
  };

  const runSearch = async (
    nextQuery = query,
    nextFilters = filters,
    recordHistory = true,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.searchResearch({
        query: nextQuery,
        kinds: nextFilters.kinds,
        court: nextFilters.court,
        category: nextFilters.category,
        dateFrom: nextFilters.dateFrom,
        dateTo: nextFilters.dateTo,
        limit: 24,
      });
      setSources(result.sources);
      setFacets(result.facets);
      setSelected(result.sources[0] ?? null);
      if (recordHistory && nextQuery.trim()) {
        const entry: HistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          query: nextQuery.trim(),
          filters: nextFilters,
          resultCount: result.sources.length,
          at: new Date().toISOString(),
        };
        persistHistory([entry, ...history.filter((h) => h.query !== entry.query)].slice(0, 20));
      }
    } catch (err) {
      setError(errorMessage(err, "Research search failed."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runSearch("", filters, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap browse once
  }, []);

  useEffect(() => {
    if (seededQuery && seededQuery !== query) {
      setQuery(seededQuery);
      void runSearch(seededQuery, filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seededQuery]);

  const toggleKind = (kind: SourceKind) => {
    setFilters((prev) => {
      const has = prev.kinds.includes(kind);
      const kinds = has ? prev.kinds.filter((k) => k !== kind) : [...prev.kinds, kind];
      return { ...prev, kinds: kinds.length ? kinds : [...DEFAULT_FILTERS.kinds] };
    });
  };

  const openPreview = (source: AssistantSource) => {
    setSelected(source);
    setPreviewOpen(true);
    setPane("preview");
  };

  const courtOptions = [
    { value: "__all__", label: "All courts" },
    ...facets.courts.map((c) => ({ value: c, label: c })),
  ];
  const categoryOptions = [
    { value: "__all__", label: "All categories" },
    ...facets.categories.map((c) => ({ value: c, label: c })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text variant="bodyStrong">Legal Research</Text>
        <Text variant="caption" tone="muted">
          Corpus search · judgments, guides, headlines
        </Text>
      </View>

      <View style={[styles.searchBlock, { borderBottomColor: colors.border }]}>
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchField,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Research topic or keywords"
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel="Research query"
              returnKeyType="search"
              onSubmitEditing={() => void runSearch()}
              style={[styles.searchInput, { color: colors.foreground }]}
            />
          </View>
          <Button
            title="Search"
            size="sm"
            loading={loading}
            disabled={loading}
            onPress={() => void runSearch()}
            style={{ minWidth: 88 }}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
        >
          {KIND_OPTIONS.map((o) => {
            const active = filters.kinds.includes(o.value);
            const count = facets.counts[o.value];
            return (
              <Chip
                key={o.value}
                label={count > 0 ? `${o.label} (${count})` : o.label}
                selected={active}
                onPress={() => toggleKind(o.value)}
              />
            );
          })}
        </ScrollView>

        <View style={styles.filterActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowFilters((v) => !v)}
            style={[styles.filterToggle, { borderColor: colors.border }]}
          >
            <Filter size={14} color={colors.foreground} />
            <Text variant="small">{showFilters ? "Hide filters" : "Filters"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setFilters(DEFAULT_FILTERS);
              void runSearch(query, DEFAULT_FILTERS, false);
            }}
          >
            <Text variant="small" tone="muted">
              Reset
            </Text>
          </Pressable>
        </View>

        {showFilters ? (
          <View style={{ gap: 10 }}>
            <SelectField
              label="Court"
              value={filters.court ?? "__all__"}
              options={courtOptions}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  court: value === "__all__" ? null : value,
                }))
              }
            />
            <SelectField
              label="Category"
              value={filters.category ?? "__all__"}
              options={categoryOptions}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  category: value === "__all__" ? null : value,
                }))
              }
            />
            <View style={styles.dateRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="caption" tone="muted">
                  From (YYYY-MM-DD)
                </Text>
                <TextInput
                  value={filters.dateFrom ?? ""}
                  onChangeText={(v) =>
                    setFilters((prev) => ({ ...prev, dateFrom: v.trim() || null }))
                  }
                  placeholder="2020-01-01"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  style={[
                    styles.dateInput,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="caption" tone="muted">
                  To (YYYY-MM-DD)
                </Text>
                <TextInput
                  value={filters.dateTo ?? ""}
                  onChangeText={(v) =>
                    setFilters((prev) => ({ ...prev, dateTo: v.trim() || null }))
                  }
                  placeholder="2026-12-31"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  style={[
                    styles.dateInput,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                />
              </View>
            </View>
            <Button
              title="Apply filters"
              variant="outline"
              size="sm"
              icon={<Filter size={14} color={colors.foreground} />}
              onPress={() => void runSearch(query, filters)}
              disabled={loading}
            />
          </View>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <Segmented
          options={[
            { value: "results", label: "Results" },
            { value: "preview", label: "Preview" },
          ]}
          value={pane}
          onChange={setPane}
        />
      </View>

      {pane === "results" ? (
        <ScrollView
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {loading && sources.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.brass} />
              <Text variant="small" tone="muted">
                Searching LegalFinder corpus…
              </Text>
            </View>
          ) : error ? (
            <View
              style={[
                styles.emptyBox,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Text variant="bodyStrong">Couldn’t load research results</Text>
              <Text variant="small" tone="muted">
                {error}
              </Text>
              <Button title="Retry" size="sm" variant="outline" onPress={() => void runSearch()} />
            </View>
          ) : sources.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                { borderColor: colors.border },
              ]}
            >
              <Text variant="bodyStrong">No matching sources</Text>
              <Text variant="small" tone="muted" align="center">
                Try broader keywords or clear the date and court filters.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {["bail after arrest", "unfair dismissal", "land succession"].map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    onPress={() => {
                      setQuery(s);
                      void runSearch(s, filters);
                    }}
                  />
                ))}
              </View>
            </View>
          ) : (
            <>
              <Text variant="caption" tone="muted">
                {sources.length} result{sources.length === 1 ? "" : "s"}
              </Text>
              {sources.map((source, index) => {
                const tint = authorityTint(source.authority, colors);
                const active =
                  selected && selected.kind === source.kind && selected.id === source.id;
                return (
                  <Pressable
                    key={`${source.kind}:${source.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !!active }}
                    onPress={() => openPreview(source)}
                    style={[
                      styles.resultCard,
                      {
                        borderColor: active ? colors.brass : colors.border,
                        backgroundColor: active ? colors.accent : colors.card,
                      },
                    ]}
                  >
                    <View style={styles.resultTop}>
                      <Text
                        variant="caption"
                        style={{ color: tint, fontFamily: fonts.sansSemiBold, flex: 1 }}
                        numberOfLines={1}
                      >
                        {authorityLabel(source.authority)}
                      </Text>
                      <Text variant="caption" tone="muted">
                        [{index + 1}]
                      </Text>
                    </View>
                    <Text variant="small" style={{ fontFamily: fonts.sansSemiBold }}>
                      {source.title}
                    </Text>
                    {source.subtitle ? (
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {source.subtitle}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </>
          )}

          {history.length > 0 ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Text variant="caption" tone="muted">
                RESEARCH HISTORY
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {history.slice(0, 8).map((entry) => (
                  <Chip
                    key={entry.id}
                    label={entry.query}
                    onPress={() => {
                      setQuery(entry.query);
                      setFilters(entry.filters);
                      void runSearch(entry.query, entry.filters, false);
                      onUseInChat(entry.query);
                    }}
                  />
                ))}
                <Chip
                  label="Clear"
                  onPress={() => {
                    persistHistory([]);
                  }}
                />
              </ScrollView>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {selected ? (
            <>
              <View
                style={[
                  styles.resultCard,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <Text
                  variant="caption"
                  style={{
                    color: authorityTint(selected.authority, colors),
                    fontFamily: fonts.sansSemiBold,
                  }}
                >
                  {authorityLabel(selected.authority)}
                </Text>
                <Text variant="h2">{selected.title}</Text>
                {selected.subtitle ? (
                  <Text variant="small" tone="muted">
                    {selected.subtitle}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {selected.court ? (
                    <Text variant="caption" tone="muted">
                      {selected.court}
                    </Text>
                  ) : null}
                  {(selected.decidedOn ?? selected.publishedAt) ? (
                    <Text variant="caption" tone="muted">
                      {String(selected.decidedOn ?? selected.publishedAt).slice(0, 10)}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Button
                  title="Ask Counsellor about this"
                  size="sm"
                  onPress={() => onAskAboutSource(selected)}
                />
                <Button
                  title="Open original"
                  size="sm"
                  variant="outline"
                  icon={<ExternalLink size={14} color={colors.foreground} />}
                  onPress={() => onOpenSource(selected)}
                />
              </View>

              {selected.summary ? (
                <View
                  style={[
                    styles.summaryBox,
                    { borderColor: colors.border, backgroundColor: colors.secondary },
                  ]}
                >
                  <Text variant="caption" tone="muted">
                    PREVIEW
                  </Text>
                  <Text variant="small">{selected.summary}</Text>
                </View>
              ) : (
                <View style={styles.centered}>
                  <BookOpen size={20} color={colors.mutedForeground} />
                  <Text variant="small" tone="muted" align="center">
                    No summary preview for this source. Open the original when it matters.
                  </Text>
                </View>
              )}

              <Text variant="caption" tone="muted">
                Authority labels mark LegalFinder catalogue entries. Editorial guides are not
                official law. Open the original when it matters — we do not scrape ULII.
              </Text>
            </>
          ) : (
            <View style={styles.centered}>
              <Text variant="small" tone="muted" align="center">
                Select a result to preview it here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Sheet
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={selected?.title ?? "Source"}
        description={selected ? authorityLabel(selected.authority) : undefined}
      >
        {selected ? (
          <View style={{ gap: 12 }}>
            {selected.summary ? (
              <Text variant="small">{selected.summary}</Text>
            ) : (
              <Text variant="small" tone="muted">
                No in-app summary — open the original catalogue entry.
              </Text>
            )}
            <Button
              title="Ask Counsellor about this"
              onPress={() => {
                setPreviewOpen(false);
                onAskAboutSource(selected);
              }}
            />
            <Button
              title="Open original"
              variant="outline"
              onPress={() => onOpenSource(selected)}
            />
            <Button
              title="Use topic in chat"
              variant="ghost"
              onPress={() => {
                setPreviewOpen(false);
                onUseInChat(selected.title);
              }}
            />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  searchBlock: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 15,
    paddingVertical: 8,
  },
  filterActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dateRow: { flexDirection: "row", gap: 10 },
  dateInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  resultCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    gap: 5,
  },
  resultTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  emptyBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    alignItems: "center",
  },
  summaryBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  centered: { alignItems: "center", gap: 10, paddingVertical: 32, paddingHorizontal: 20 },
});
