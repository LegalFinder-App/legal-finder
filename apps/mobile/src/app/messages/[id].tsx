import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, SendHorizontal } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { EmptyState, ErrorState, LoadingRows, Text } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { useSession } from "@/lib/session";
import { conversationsQuery, messagesQuery, type Message } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/lib/toast";

function Thread({ conversationId }: { conversationId: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const qc = useQueryClient();
  const conversations = useQuery(conversationsQuery(user?.id));
  const messages = useQuery(messagesQuery(conversationId));
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const conversation = conversations.data?.find((c) => c.id === conversationId);

  // Mark the other side's messages read on open (same as the web's messaging workspace).
  useEffect(() => {
    if (!user?.id) return;
    void supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["unread-messages", user.id] });
      });
  }, [conversationId, user?.id, messages.data?.length, qc]);

  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", conversationId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !user) return;
    setSending(true);
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_name: user.fullName || user.email || "LegalFinder user",
      body,
    });
    setSending(false);
    if (error) {
      setDraft(body);
      toast.error(error.message);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await supabase
      .from("conversations")
      .update({ last_message: body, last_message_at: new Date().toISOString() })
      .eq("id", conversationId);
    qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    qc.invalidateQueries({ queryKey: ["conversations", user.id] });
  };

  const data = messages.data ?? [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen options={{ title: conversation?.subject ?? "Conversation" }} />
      {messages.isLoading ? (
        <View style={{ padding: 20 }}>
          <LoadingRows rows={5} height={60} />
        </View>
      ) : messages.isError ? (
        <View style={{ padding: 20 }}>
          <ErrorState
            message={(messages.error as Error).message}
            onRetry={() => void messages.refetch()}
          />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={data}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: data.length > 0 })}
          ListEmptyComponent={
            <EmptyState
              title="No messages yet"
              description="Send the first secure message in this thread."
            />
          }
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.id;
            return (
              <View style={[styles.bubbleWrap, { alignItems: mine ? "flex-end" : "flex-start" }]}>
                {!mine ? (
                  <Text variant="caption" tone="muted" style={{ marginBottom: 3, marginLeft: 6 }}>
                    {item.sender_name}
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    mine
                      ? { backgroundColor: colors.brass, borderBottomRightRadius: 4 }
                      : {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderBottomLeftRadius: 4,
                        },
                  ]}
                >
                  <Text
                    style={{ color: mine ? colors.brassForeground : colors.foreground }}
                    selectable
                  >
                    {item.body}
                  </Text>
                </View>
                <View style={styles.meta}>
                  <Text variant="caption" tone="muted">
                    {formatDateTime(item.created_at)}
                  </Text>
                  {mine && item.read_at ? (
                    <CheckCheck size={12} color={colors.brass} accessibilityLabel="Read" />
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}

      <View
        style={[
          styles.composer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.card,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={4000}
          accessibilityLabel="Message"
          style={[
            styles.input,
            {
              color: colors.foreground,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!draft.trim() || sending}
          onPress={() => void send()}
          style={[styles.send, { backgroundColor: draft.trim() ? colors.brass : colors.muted }]}
        >
          <SendHorizontal
            size={20}
            color={draft.trim() ? colors.brassForeground : colors.mutedForeground}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RequireAuth>
      <Thread conversationId={id} />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, flexGrow: 1 },
  bubbleWrap: { maxWidth: "100%" },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3, marginHorizontal: 6 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
