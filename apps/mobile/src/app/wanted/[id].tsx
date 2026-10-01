import { View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { AlertTriangle, ShieldAlert } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingRows,
  Screen,
  StatusPill,
  Text,
} from "@/components/ui";
import { openLink } from "@/components/Markdown";
import { wantedPersonQuery } from "@/lib/queries";
import { formatDate, formatUGX } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

export default function WantedPersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const person = useQuery(wantedPersonQuery(id));

  if (person.isLoading) {
    return (
      <Screen>
        <LoadingRows rows={2} height={260} />
      </Screen>
    );
  }
  if (person.isError) {
    return (
      <Screen>
        <ErrorState
          message={(person.error as Error).message}
          onRetry={() => void person.refetch()}
        />
      </Screen>
    );
  }
  const w = person.data;
  if (!w) {
    return (
      <Screen>
        <EmptyState title="Notice not found" description="It may have been resolved and removed." />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View
          style={{
            padding: 16,
            // Clear the home indicator / Android navigation bar (the app is edge-to-edge).
            paddingBottom: Math.max(insets.bottom + 12, 28),
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Button
            title="Report a sighting"
            icon={<ShieldAlert size={16} color={colors.brassForeground} />}
            onPress={() => router.push({ pathname: "/report", params: { subject: w.name } })}
            fullWidth
            size="lg"
          />
        </View>
      }
    >
      <Stack.Screen options={{ title: "Public notice" }} />
      <View
        style={{
          aspectRatio: 4 / 3,
          borderRadius: 14,
          overflow: "hidden",
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
            accessibilityLabel={`Photo of ${w.name}`}
          />
        ) : (
          <AlertTriangle size={36} color={colors.mutedForeground} />
        )}
      </View>
      <View style={{ gap: 6 }}>
        <Text variant="h1">{w.name}</Text>
        {w.alias && w.alias !== "—" ? <Text tone="muted">Also known as {w.alias}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatusPill value={w.status} />
          <StatusPill value={w.danger_level} />
        </View>
      </View>
      <Card>
        {[
          ["Offence", w.offence],
          ["Last seen", w.last_seen],
          ["Reward", w.reward ? formatUGX(Number(w.reward)) : null],
          ["Published", formatDate(w.created_at)],
        ]
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", paddingVertical: 6, gap: 12 }}>
              <Text variant="small" tone="muted" style={{ width: 90 }}>
                {k}
              </Text>
              <Text variant="small" style={{ flex: 1 }}>
                {v}
              </Text>
            </View>
          ))}
      </Card>
      {w.description ? <Text style={{ lineHeight: 23 }}>{w.description}</Text> : null}
      <Text variant="caption" tone="muted">
        Do not approach. If you have information, report it or contact your nearest police station.
        Official notices:{" "}
        <Text variant="caption" tone="brass" onPress={() => openLink("https://upf.go.ug/")}>
          upf.go.ug
        </Text>
        .
      </Text>
    </Screen>
  );
}
