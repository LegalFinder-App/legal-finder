import { Share, View } from "react-native";
import { Stack } from "expo-router";
import { Image } from "expo-image";
import { Share2 } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, EmptyState, ErrorState, LoadingRows, Screen, Tag, Text } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { env } from "@/lib/env";

type ArticleData = {
  title: string;
  summary?: string | null;
  body?: string | null;
  image_url?: string | null;
  author_name?: string | null;
  category?: string | null;
  meta?: string | null;
};

/** Shared reader for advice guides and news posts. */
export function Article({
  query,
  webPath,
  eyebrow,
}: {
  query: {
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    data: ArticleData | null | undefined;
    refetch: () => unknown;
    isRefetching: boolean;
  };
  webPath: string;
  eyebrow: string;
}) {
  const { colors } = useTheme();

  if (query.isLoading) {
    return (
      <Screen>
        <LoadingRows rows={3} height={140} />
      </Screen>
    );
  }
  if (query.isError) {
    return (
      <Screen>
        <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }
  const a = query.data;
  if (!a) {
    return (
      <Screen>
        <EmptyState title="Not found" description="This article may have been unpublished." />
      </Screen>
    );
  }

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <Button
              title=""
              variant="ghost"
              size="sm"
              accessibilityLabel="Share article"
              icon={<Share2 size={18} color={colors.foreground} />}
              onPress={() => void Share.share({ message: `${a.title} — ${env.apiUrl}${webPath}` })}
            />
          ),
        }}
      />
      {a.image_url ? (
        <Image
          source={{ uri: a.image_url }}
          style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 12 }}
          contentFit="cover"
          transition={200}
        />
      ) : null}
      <View style={{ gap: 8 }}>
        <Text variant="eyebrow" tone="brass">
          {eyebrow}
        </Text>
        <Text variant="h1" accessibilityRole="header">
          {a.title}
        </Text>
        {a.meta || a.author_name ? (
          <Text variant="small" tone="muted">
            {a.meta ?? a.author_name}
          </Text>
        ) : null}
        {a.category ? <Tag label={a.category} /> : null}
      </View>
      {a.summary ? (
        <Text variant="h3" tone="muted" style={{ fontFamily: undefined, lineHeight: 26 }}>
          {a.summary}
        </Text>
      ) : null}
      {a.body ? <Markdown text={a.body} /> : null}
      <View
        style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, marginTop: 8 }}
      >
        <Text variant="caption" tone="muted">
          General guidance only — not a substitute for advice from a qualified advocate.
        </Text>
      </View>
    </Screen>
  );
}
