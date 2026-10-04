import { useEffect, useRef, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardEvents } from "react-native-keyboard-controller";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCheck, EllipsisVertical, SendHorizontal } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { useWideLayout, wideColumn } from "@/lib/layout";
import { fonts } from "@/theme/tokens";
import { Button, EmptyState, ErrorState, KeyboardLift, LoadingRows, Text } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { ReportSheet } from "@/components/ReportSheet";
import { showAlert } from "@/lib/alert";
import { blockUser, myBlocksQuery, unblockUser } from "@/lib/moderation";
import { useSession } from "@/lib/session";
import { conversationsQuery, messagesQuery, type Message } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { errorMessage, toast } from "@/lib/toast";

function Thread({ conversationId }: { conversationId: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const wide = useWideLayout();
  const { user } = useSession();
  const qc = useQueryClient();
  const conversations = useQuery(conversationsQuery(user?.id));
  const messages = useQuery(messagesQuery(conversationId));
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const conversation = conversations.data?.find((c) => c.id === conversationId);
  const otherId =
    conversation && user
      ? conversation.participant_a === user.id
        ? conversation.participant_b
        : conversation.participant_a
      : null;
  const blocks = useQuery(myBlocksQuery(user?.id));
  const blocked = Boolean(otherId && blocks.data?.includes(otherId));
  const [reporting, setReporting] = useState<{
    type: "message" | "user";
    id: string;
    label: string;
  } | null>(null);
  // Opened from an alert button: iOS won't present the sheet while the alert is still closing.
  const openReport = (target: NonNullable<typeof reporting>) =>
    setTimeout(() => setReporting(target), Platform.OS === "ios" ? 500 : 0);

  // The keyboard shrinks the list from the bottom; keep the latest messages in view.
  useEffect(() => {
    const sub = KeyboardEvents.addListener("keyboardDidShow", () =>
      listRef.current?.scrollToEnd({ animated: true }),
    );
    return () => sub.remove();
  }, []);

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
  const otherName =
    [...data].reverse().find((m) => m.sender_id === otherId)?.sender_name || "this person";

  const toggleBlock = async () => {
    if (!user || !otherId) return;
    try {
      if (blocked) {
        await unblockUser(user.id, otherId);
        toast.success(`${otherName} is unblocked`);
      } else {
        await blockUser(user.id, otherId);
        toast.success(`${otherName} is blocked`, {
          description: "Neither of you can send messages to the other now.",
        });
      }
      await qc.invalidateQueries({ queryKey: ["blocks", user.id] });
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't change the block"));
    }
  };

  // Report or block the other person: the conversation's menu (top right).
  const openMenu = () => {
    if (!otherId) return;
    showAlert(otherName, undefined, [
      {
        text: `Report ${otherName}`,
        onPress: () => openReport({ type: "user", id: otherId, label: otherName }),
      },
      blocked
        ? { text: `Unblock ${otherName}`, onPress: () => void toggleBlock() }
        : {
            text: `Block ${otherName}`,
            style: "destructive",
            onPress: () =>
              showAlert(
                `Block ${otherName}?`,
                "Neither of you will be able to send messages to the other. You can unblock them here at any time.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Block", style: "destructive", onPress: () => void toggleBlock() },
                ],
              ),
          },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Press and hold one of their messages to report it.
  const messageActions = (item: Message) =>
    showAlert("This message", undefined, [
      {
        text: "Report message",
        style: "destructive",
        onPress: () => openReport({ type: "message", id: item.id, label: "this message" }),
      },
      { text: "Cancel", style: "cancel" },
    ]);

  return (
    <KeyboardLift style={{ flex: 1, backgroundColor: colors.background }} gap={10}>
      <View style={[{ flex: 1 }, wide && wideColumn]}>
        <Stack.Screen
          options={{
            title: conversation?.subject ?? "Conversation",
            headerRight: () =>
              otherId ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Report or block"
                  onPress={openMenu}
                  hitSlop={10}
                  style={{ paddingHorizontal: 6 }}
                >
                  <EllipsisVertical size={22} color={colors.foreground} />
                </Pressable>
              ) : null,
          }}
        />
        <ReportSheet target={reporting} onClose={() => setReporting(null)} />
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
                  <Pressable
                    disabled={mine}
                    onLongPress={() => messageActions(item)}
                    delayLongPress={350}
                    accessibilityHint={mine ? undefined : "Press and hold to report this message"}
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
                  </Pressable>
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

        {blocked ? (
          <View
            style={[
              styles.blockedBar,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.card,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <Ban size={18} color={colors.mutedForeground} />
            <Text variant="small" tone="muted" style={{ flex: 1 }}>
              You blocked {otherName}. Neither of you can send messages to the other.
            </Text>
            <Button
              title="Unblock"
              size="sm"
              variant="outline"
              onPress={() => void toggleBlock()}
            />
          </View>
        ) : (
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
        )}
      </View>
    </KeyboardLift>
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
  blockedBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
