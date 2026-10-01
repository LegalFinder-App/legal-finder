import { FlatList, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useWideLayout, wideContent } from "@/lib/layout";
import { Avatar, Card, EmptyState, ErrorState, LoadingRows, Text } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { useSession } from "@/lib/session";
import { conversationsQuery } from "@/lib/queries";
import { formatRelative } from "@/lib/format";

function ConversationList() {
  const { colors } = useTheme();
  const wide = useWideLayout();
  const { user } = useSession();
  const conversations = useQuery(conversationsQuery(user?.id));

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={conversations.data ?? []}
      keyExtractor={(c) => c.id}
      contentContainerStyle={[styles.list, wide && wideContent]}
      refreshing={conversations.isRefetching}
      onRefresh={() => void conversations.refetch()}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={
        <Text variant="small" tone="muted" style={{ marginBottom: 14 }}>
          Secure conversations with your advocates, clients and officers. Replies arrive in real
          time.
        </Text>
      }
      renderItem={({ item }) => {
        const title = item.subject ?? `Thread ${item.id.slice(0, 6)}`;
        return (
          <Card
            onPress={() => router.push(`/messages/${item.id}`)}
            accessibilityLabel={`Conversation: ${title}`}
          >
            <View style={styles.row}>
              <Avatar name={title.replace(/^Consultation with /, "")} size={46} />
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                    {title}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {formatRelative(item.last_message_at)}
                  </Text>
                </View>
                <Text variant="small" tone="muted" numberOfLines={2} style={{ marginTop: 2 }}>
                  {item.last_message ?? "Start the conversation"}
                </Text>
              </View>
            </View>
          </Card>
        );
      }}
      ListEmptyComponent={
        conversations.isLoading ? (
          <LoadingRows rows={5} />
        ) : conversations.isError ? (
          <ErrorState
            message={(conversations.error as Error).message}
            onRetry={() => void conversations.refetch()}
          />
        ) : (
          <EmptyState
            icon={<MessageSquare size={22} color={colors.brass} />}
            title="No conversations yet"
            description="Message an advocate from their profile, or wait for your advocate to reach out."
          />
        )
      }
    />
  );
}

export default function MessagesTab() {
  return (
    <RequireAuth message="Sign in to message advocates securely.">
      <ConversationList />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 48 },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});
