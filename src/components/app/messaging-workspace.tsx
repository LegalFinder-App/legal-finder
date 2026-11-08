import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Send, MessageSquare } from "lucide-react";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, LoadingRows, StatusPill } from "@/components/common/bits";
import { conversationsQuery, messagesQuery } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { getEmptyStateMedia, siteMediaQuery } from "@/lib/site-media";

export function MessagingWorkspace() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const conversations = useQuery(conversationsQuery(user?.id));
  const siteMedia = useQuery(siteMediaQuery);
  const emptyMedia = siteMedia.data
    ? getEmptyStateMedia(siteMedia.data, "empty-state-chambers")
    : undefined;
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!selectedConversationId && conversations.data?.[0]?.id) {
      setSelectedConversationId(conversations.data[0].id);
    }
  }, [conversations.data, selectedConversationId]);

  const selectedConversation = useMemo(
    () =>
      conversations.data?.find((conversation) => conversation.id === selectedConversationId) ??
      null,
    [conversations.data, selectedConversationId],
  );

  const messages = useQuery(messagesQuery(selectedConversationId));

  useEffect(() => {
    if (!user?.id || !selectedConversationId) return;

    const markRead = async () => {
      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", selectedConversationId)
        .neq("sender_id", user.id)
        .is("read_at", null);

      if (error) {
        console.debug("[messages] read marker skipped", error.message);
      }
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConversationId] });
    };

    void markRead();
  }, [queryClient, selectedConversationId, user?.id]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const channel = supabase
      .channel(`conversation-${selectedConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", selectedConversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, selectedConversationId, user?.id]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !user?.id || !selectedConversationId || !selectedConversation) return;

    const senderName = user.fullName || user.email || "LegalFinder user";

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConversationId,
      sender_id: user.id,
      sender_name: senderName,
      body,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    await supabase
      .from("conversations")
      .update({ last_message: body, last_message_at: new Date().toISOString() })
      .eq("id", selectedConversationId);

    setDraft("");
    queryClient.invalidateQueries({ queryKey: ["messages", selectedConversationId] });
    queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">Secure messaging</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Messages</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Conversations stay in sync across devices and update in real time when the other side
        replies.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="card p-4">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Conversations</h2>
              <p className="text-xs text-muted-foreground">Select a thread to continue the case.</p>
            </div>
            <MessageSquare className="h-5 w-5 text-brass" />
          </div>

          <div className="mt-4 space-y-3">
            {conversations.isLoading ? (
              <LoadingRows rows={4} />
            ) : (conversations.data ?? []).length === 0 ? (
              <EmptyState
                imageUrl={emptyMedia?.image_url}
                imageAlt={emptyMedia?.alt_text}
                title="No conversations yet"
                description="When a lawyer, client or officer starts a thread, it will appear here."
              />
            ) : (
              (conversations.data ?? []).map((conversation) => {
                const active = conversation.id === selectedConversationId;
                const participantName =
                  conversation.subject ?? `Thread ${conversation.id.slice(0, 6)}`;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={[
                      "w-full rounded-lg border p-4 text-left transition-colors",
                      active ? "border-brass bg-brass/10" : "border-border hover:bg-secondary/50",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-semibold">{participantName}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {conversation.last_message ?? "Open thread"}
                        </p>
                      </div>
                      <StatusPill value={active ? "active" : "pending"} />
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {new Date(conversation.last_message_at).toLocaleString()}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-[70vh] flex-col card">
          <div className="border-b border-border p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-brass">Active thread</p>
                <h2 className="mt-1 font-display text-xl font-semibold">
                  {selectedConversation?.subject ?? "Select a conversation"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedConversation
                    ? "Messages are protected by row-level security and delivered through Supabase realtime."
                    : "Choose a conversation on the left to view the thread."}
                </p>
              </div>
              {selectedConversation && <StatusPill value="active" />}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {!selectedConversationId ? (
              <EmptyState
                title="No thread selected"
                description="Pick a conversation to read the latest messages and reply."
              />
            ) : messages.isLoading ? (
              <LoadingRows rows={4} />
            ) : (messages.data ?? []).length === 0 ? (
              <EmptyState
                title="No messages yet"
                description="Send the first secure message in this thread."
              />
            ) : (
              (messages.data ?? []).map((message) => {
                const mine = message.sender_id === user?.id;

                return (
                  <div
                    key={message.id}
                    className={mine ? "ml-auto max-w-2xl" : "mr-auto max-w-2xl"}
                  >
                    <div
                      className={[
                        "rounded-2xl border p-4",
                        mine ? "border-brass/40 bg-brass/10" : "border-border bg-secondary/50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-display text-sm font-semibold">{message.sender_name}</p>
                        <span className="text-[0.7rem] text-muted-foreground">
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {message.body}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={sendMessage} className="border-t border-border p-5">
            <div className="space-y-3">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={
                  selectedConversationId ? "Write a message..." : "Select a conversation first"
                }
                rows={4}
                disabled={!selectedConversationId}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Replies are saved immediately and synced to other devices in real time.
                </p>
                <Button type="submit" disabled={!selectedConversationId || !draft.trim()}>
                  Send message <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
