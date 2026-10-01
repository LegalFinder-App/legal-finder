import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { padToColumns, useWideLayout, wideContent } from "@/lib/layout";
import {
  ChipRow,
  EmptyState,
  ErrorState,
  Input,
  LoadingRows,
  SwitchField,
  Text,
} from "@/components/ui";
import { LawyerCard } from "@/components/LawyerCard";
import { publicLawyersQuery } from "@/lib/queries";

const ALL = "__all";

export default function AdvocatesTab() {
  const { colors } = useTheme();
  const wide = useWideLayout();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [area, setArea] = useState<string>(ALL);
  const [district, setDistrict] = useState<string>(ALL);
  const [acceptingOnly, setAcceptingOnly] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Search by name runs server-side (ilike); area/district/accepting filter the loaded list so the
  // filter chips can be built from whatever advocates actually exist.
  const lawyers = useQuery(publicLawyersQuery(debounced ? { q: debounced } : undefined));
  const all = useMemo(() => lawyers.data ?? [], [lawyers.data]);

  const areas = useMemo(
    () => Array.from(new Set(all.flatMap((l) => l.practice_areas ?? []))).sort(),
    [all],
  );
  const districts = useMemo(
    () =>
      Array.from(new Set(all.map((l) => l.county).filter((c): c is string => Boolean(c)))).sort(),
    [all],
  );

  const rows = all.filter(
    (l) =>
      (area === ALL || (l.practice_areas ?? []).includes(area)) &&
      (district === ALL || l.county === district) &&
      (!acceptingOnly || l.accepting_clients),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        // Changing numColumns needs a fresh list, hence the key.
        key={wide ? "grid" : "list"}
        numColumns={wide ? 2 : 1}
        columnWrapperStyle={wide ? { gap: 12 } : undefined}
        data={lawyers.isLoading || lawyers.isError ? [] : padToColumns(rows, wide ? 2 : 1)}
        keyExtractor={(l, index) => l?.id ?? `filler-${index}`}
        renderItem={({ item }) =>
          item ? <LawyerCard lawyer={item} fill={wide} /> : <View style={{ flex: 1 }} />
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={[styles.list, wide && wideContent]}
        keyboardShouldPersistTaps="handled"
        refreshing={lawyers.isRefetching}
        onRefresh={() => void lawyers.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="small" tone="muted">
              Every advocate is checked against the roll before their profile is published.
            </Text>
            <Input
              value={q}
              onChangeText={setQ}
              placeholder="Search by name"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search advocates by name"
            />
            {areas.length > 0 ? (
              <ChipRow
                value={area}
                onChange={setArea}
                options={[
                  { value: ALL, label: "All areas" },
                  ...areas.map((a) => ({ value: a, label: a })),
                ]}
              />
            ) : null}
            {districts.length > 0 ? (
              <ChipRow
                value={district}
                onChange={setDistrict}
                options={[
                  { value: ALL, label: "All districts" },
                  ...districts.map((d) => ({ value: d, label: d })),
                ]}
              />
            ) : null}
            <SwitchField
              label="Accepting new clients"
              value={acceptingOnly}
              onChange={setAcceptingOnly}
            />
            {!lawyers.isLoading ? (
              <Text variant="small" tone="muted">
                {rows.length} advocate{rows.length === 1 ? "" : "s"}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          lawyers.isLoading ? (
            <LoadingRows rows={4} height={150} />
          ) : lawyers.isError ? (
            <ErrorState
              message={(lawyers.error as Error).message}
              onRetry={() => void lawyers.refetch()}
            />
          ) : (
            <EmptyState
              icon={
                debounced ? (
                  <Search size={22} color={colors.brass} />
                ) : (
                  <Users size={22} color={colors.brass} />
                )
              }
              title="No advocates match"
              description="Try a different name, practice area or district."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 48 },
  header: { gap: 12, marginBottom: 16 },
});
