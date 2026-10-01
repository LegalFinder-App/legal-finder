import { FlatList, View } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { AlertTriangle, EyeOff } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { padToColumns, useWideLayout, wideContent } from "@/lib/layout";
import { Card, EmptyState, ErrorState, LoadingRows, StatusPill, Text } from "@/components/ui";
import { openLink } from "@/components/Markdown";
import { appSettingsQuery, wantedQuery } from "@/lib/queries";
import { formatUGX } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

export default function WantedScreen() {
  const { colors } = useTheme();
  const wide = useWideLayout();
  const columns = wide ? 4 : 2;
  const settings = useQuery(appSettingsQuery);
  const wanted = useQuery(wantedQuery);

  if (settings.data && !settings.data.wanted_notices_enabled) {
    return (
      <View style={{ flex: 1, padding: 20, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: "Public notices" }} />
        <EmptyState
          icon={<EyeOff size={22} color={colors.brass} />}
          title="Public notices are unavailable"
          description="This section has been paused by the administrators."
        />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Public notices" }} />
      <FlatList
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[{ padding: 20, paddingBottom: 48 }, wide && wideContent]}
        // Changing numColumns needs a fresh list, hence the key.
        key={columns}
        data={wanted.isLoading || wanted.isError ? [] : padToColumns(wanted.data ?? [], columns)}
        keyExtractor={(w, index) => w?.id ?? `filler-${index}`}
        numColumns={columns}
        columnWrapperStyle={{ gap: 12 }}
        refreshing={wanted.isRefetching}
        onRefresh={() => void wanted.refetch()}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={{ gap: 6, marginBottom: 16 }}>
            <Text variant="small" tone="muted">
              Notices published by police services. If you have information, report it — anonymously
              if you prefer.
            </Text>
            <Text
              variant="caption"
              tone="brass"
              onPress={() => openLink("https://upf.go.ug/")}
              accessibilityRole="link"
            >
              Official source: Uganda Police Force (upf.go.ug)
            </Text>
          </View>
        }
        renderItem={({ item: w }) =>
          !w ? (
            <View style={{ flex: 1 }} />
          ) : (
            <Card
              padded={false}
              onPress={() => router.push(`/wanted/${w.id}`)}
              accessibilityLabel={`Notice: ${w.name}`}
              style={{ flex: 1, overflow: "hidden" }}
            >
              <View
                style={{
                  aspectRatio: 4 / 5,
                  backgroundColor: colors.muted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {w.photo_url ? (
                  <Image
                    source={{ uri: mediaUrl(w.photo_url) ?? undefined }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <AlertTriangle size={28} color={colors.mutedForeground} />
                )}
              </View>
              <View style={{ padding: 12, gap: 4 }}>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {w.name}
                </Text>
                {w.offence ? (
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {w.offence}
                  </Text>
                ) : null}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    // On a narrow card the reward drops under the pill instead of breaking mid-amount.
                    flexWrap: "wrap",
                    rowGap: 4,
                    marginTop: 4,
                  }}
                >
                  <StatusPill value={w.danger_level} />
                  {w.reward ? (
                    <Text variant="caption" tone="brass">
                      {formatUGX(Number(w.reward))}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          )
        }
        ListEmptyComponent={
          wanted.isLoading ? (
            <LoadingRows rows={3} height={200} />
          ) : wanted.isError ? (
            <ErrorState
              message={(wanted.error as Error).message}
              onRetry={() => void wanted.refetch()}
            />
          ) : (
            <EmptyState
              icon={<AlertTriangle size={22} color={colors.brass} />}
              title="No active notices"
            />
          )
        }
      />
    </>
  );
}
