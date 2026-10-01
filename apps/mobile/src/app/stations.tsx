import { useMemo, useState } from "react";
import { FlatList, Linking, Platform, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Navigation, Phone } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useWideLayout, wideContent } from "@/lib/layout";
import {
  Button,
  Card,
  ChipRow,
  EmptyState,
  ErrorState,
  Input,
  LoadingRows,
  Text,
} from "@/components/ui";
import { stationsQuery } from "@/lib/queries";

const ALL = "__all";

function directionsUrl(lat: number, lng: number, label: string) {
  const q = encodeURIComponent(label);
  return Platform.OS === "ios"
    ? `maps:?q=${q}&ll=${lat},${lng}`
    : `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
}

export default function StationsScreen() {
  const { colors } = useTheme();
  const wide = useWideLayout();
  const stations = useQuery(stationsQuery);
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState(ALL);
  const districts = useMemo(
    () =>
      Array.from(
        new Set((stations.data ?? []).map((s) => s.county).filter((c): c is string => Boolean(c))),
      ).sort(),
    [stations.data],
  );
  const term = q.trim().toLowerCase();
  const rows = (stations.data ?? []).filter(
    (s) =>
      (district === ALL || s.county === district) &&
      (!term || [s.name, s.address, s.county].some((f) => f?.toLowerCase().includes(term))),
  );

  return (
    <>
      <Stack.Screen options={{ title: "Police stations" }} />
      <FlatList
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[{ padding: 20, paddingBottom: 48 }, wide && wideContent]}
        data={stations.isLoading || stations.isError ? [] : rows}
        keyExtractor={(s) => s.id}
        keyboardShouldPersistTaps="handled"
        refreshing={stations.isRefetching}
        onRefresh={() => void stations.refetch()}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 16 }}>
            <Text variant="small" tone="muted">
              Station contacts for the public directory. For emergencies call 999 or 112.
            </Text>
            <Input
              value={q}
              onChangeText={setQ}
              placeholder="Search stations"
              returnKeyType="search"
            />
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
          </View>
        }
        renderItem={({ item: s }) => (
          <Card>
            <Text variant="h3">{s.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <MapPin size={13} color={colors.mutedForeground} />
              <Text variant="small" tone="muted" style={{ flex: 1 }}>
                {[s.address, s.county].filter(Boolean).join(", ")}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {s.phone ? (
                <Button
                  title="Call"
                  size="sm"
                  variant="outline"
                  icon={<Phone size={14} color={colors.foreground} />}
                  onPress={() => void Linking.openURL(`tel:${s.phone}`)}
                />
              ) : null}
              {s.email ? (
                <Button
                  title="Email"
                  size="sm"
                  variant="outline"
                  icon={<Mail size={14} color={colors.foreground} />}
                  onPress={() => void Linking.openURL(`mailto:${s.email}`)}
                />
              ) : null}
              {s.latitude != null && s.longitude != null ? (
                <Button
                  title="Directions"
                  size="sm"
                  variant="outline"
                  icon={<Navigation size={14} color={colors.foreground} />}
                  onPress={() =>
                    void Linking.openURL(
                      directionsUrl(Number(s.latitude), Number(s.longitude), s.name),
                    )
                  }
                />
              ) : null}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          stations.isLoading ? (
            <LoadingRows rows={4} />
          ) : stations.isError ? (
            <ErrorState
              message={(stations.error as Error).message}
              onRetry={() => void stations.refetch()}
            />
          ) : (
            <EmptyState title="No stations match" />
          )
        }
      />
    </>
  );
}
