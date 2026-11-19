import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  EllipsisVertical,
  Flag,
  MessageSquare,
  Search,
  Send,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingRows } from "@/components/common/bits";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { conversationsQuery, messagesQuery } from "@/lib/queries";
import { useSession, initials } from "@/lib/session";
import {
  blockUser,
  myBlocksQuery,
  unblockUser,
} from "@/lib/moderation";
import { cn } from "@/lib/utils";
import {
  WorkspaceBleed,
  WorkspaceEmpty,
  relativeTime,
} from "@/components/app/workspace/workspace-frame";
import { ReportDialog, type ReportTarget } from "@/components/app/messaging/report-dialog";

export function MessagingWorkspace() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const conversations = useQuery(conversationsQuery(user?.id));
  const blocks = useQuery(myBlocksQuery(user?.id));
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const filtered = useMemo(() => {
    const list = conversations.data ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const subject = (c.subject ?? "").toLowerCase();
      const last = (c.last_message ?? "").toLowerCase();
      return subject.includes(q) || last.includes(q);
    });
  }, [conversations.data, filter]);

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

  const otherId = useMemo(() => {
    if (!selectedConversation || !user?.id) return null;
    return selectedConversation.participant_a === user.id
      ? selectedConversation.participant_b
      : selectedConversation.participant_a;
  }, [selectedConversation, user?.id]);

  const otherName = selectedConversation?.subject?.trim() || "Participant";
  const blocked = Boolean(otherId && blocks.data?.includes(otherId));

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
      if (error) console.debug("[messages] read marker skipped", error.message);
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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.data, selectedConversationId]);

  const selectConversation = (id: string) => {
    setSelectedConversationId(id);
    setMobileShowThread(true);
  };

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || !user?.id || !selectedConversationId || !selectedConversation) return;
    if (blocked) {
      toast.error("Unblock this person to send messages.");
      return;
    }

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
    composerRef.current?.focus();
  };

  const toggleBlock = async () => {
    if (!user?.id || !otherId) return;
    try {
      if (blocked) {
        await unblockUser(user.id, otherId);
        toast.success(`${otherName} is unblocked`);
      } else {
        await blockUser(user.id, otherId);
        toast.success(`${otherName} is blocked`, {
          description: "Neither of you can message the other until you unblock.",
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["blocks", user.id] });
      setBlockConfirm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the block");
    }
  };

  const listPane = (
    <aside
      className={cn(
        "flex min-h-0 flex-col border-border bg-background",
        "md:w-[min(100%,22rem)] md:shrink-0 md:border-r lg:w-96",
        mobileShowThread ? "hidden md:flex" : "flex w-full flex-1",
      )}
    >
      <div className="shrink-0 space-y-3 border-b border-border/80 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
              Messages
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Secure threads with advocates and officers
            </p>
          </div>
          <div className="hidden h-9 w-9 items-center justify-center rounded-xl border border-brass/25 bg-brass/10 text-brass sm:flex">
            <MessageSquare className="h-4 w-4" />
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search conversations…"
            className="h-9 rounded-xl bg-secondary/40 pl-9 text-sm"
            aria-label="Search conversations"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3">
        {conversations.isLoading ? (
          <div className="p-3">
            <LoadingRows rows={5} />
          </div>
        ) : filtered.length === 0 ? (
          <WorkspaceEmpty
            icon={<MessageSquare className="h-6 w-6" />}
            title={filter ? "No matching threads" : "No conversations yet"}
            description={
              filter
                ? "Try a different name or keyword."
                : "When a lawyer, client, or officer starts a thread, it appears here."
            }
          />
        ) : (
          <ul className="space-y-1">
            {filtered.map((conversation) => {
              const active = conversation.id === selectedConversationId;
              const title = conversation.subject?.trim() || `Thread ${conversation.id.slice(0, 6)}`;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      active
                        ? "bg-brass/12 ring-1 ring-brass/30"
                        : "hover:bg-secondary/60",
                    )}
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground ring-1 ring-border">
                      {initials(title)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-display text-sm font-semibold">{title}</span>
                        <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                          {relativeTime(conversation.last_message_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {conversation.last_message ?? "Open thread"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );

  const threadPane = (
    <section
      className={cn(
        "min-h-0 min-w-0 flex-1 flex-col bg-background",
        mobileShowThread ? "flex" : "hidden md:flex",
      )}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border/80 px-3 py-3 sm:gap-3 sm:px-5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Back to conversations"
          onClick={() => setMobileShowThread(false)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {selectedConversation ? (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold ring-1 ring-border">
              {initials(otherName)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-sm font-semibold sm:text-base">
                {otherName}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                {blocked ? "Blocked" : "End-to-end sync · replies update live"}
              </p>
            </div>
            {otherId ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Conversation actions"
                  >
                    <EllipsisVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={() =>
                      setReporting({ type: "user", id: otherId, label: otherName })
                    }
                  >
                    <Flag className="h-4 w-4" /> Report {otherName}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => (blocked ? void toggleBlock() : setBlockConfirm(true))}
                  >
                    <Ban className="h-4 w-4" /> {blocked ? "Unblock" : "Block"} {otherName}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold sm:text-base">Select a conversation</h2>
            <p className="text-xs text-muted-foreground">Pick a thread to read and reply</p>
          </div>
        )}
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5"
      >
        {!selectedConversationId ? (
          <WorkspaceEmpty
            icon={<MessageSquare className="h-6 w-6" />}
            title="No thread selected"
            description="Choose a conversation from the list to continue the case."
          />
        ) : messages.isLoading ? (
          <LoadingRows rows={5} />
        ) : (messages.data ?? []).length === 0 ? (
          <WorkspaceEmpty
            title="No messages yet"
            description="Send the first message in this thread."
          />
        ) : (
          (messages.data ?? []).map((message) => {
            const mine = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={cn(
                  "group flex max-w-[min(100%,36rem)] flex-col gap-1",
                  mine ? "ml-auto items-end" : "mr-auto items-start",
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                    mine
                      ? "rounded-br-md bg-brass text-brass-foreground"
                      : "rounded-bl-md border border-border/80 bg-card text-foreground",
                  )}
                >
                  {!mine ? (
                    <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      {message.sender_name}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap">{message.body}</p>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[0.65rem] text-muted-foreground">
                    {relativeTime(message.created_at)}
                  </span>
                  {!mine ? (
                    <button
                      type="button"
                      className="text-[0.65rem] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() =>
                        setReporting({
                          type: "message",
                          id: message.id,
                          label: "this message",
                        })
                      }
                    >
                      Report
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={(event) => void sendMessage(event)}
        className="shrink-0 border-t border-border/80 bg-background/95 p-3 backdrop-blur-md sm:p-4"
      >
        {blocked ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
            <p className="text-muted-foreground">
              You blocked {otherName}. Messaging is paused both ways.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => void toggleBlock()}>
              Unblock
            </Button>
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-2xl border border-border/80 bg-secondary/30 p-2 focus-within:border-brass/40 focus-within:ring-2 focus-within:ring-brass/20">
          <Textarea
            ref={composerRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder={
              selectedConversationId
                ? blocked
                  ? "Unblock to reply…"
                  : "Write a message…"
                : "Select a conversation first"
            }
            rows={1}
            disabled={!selectedConversationId || blocked}
            className="max-h-36 min-h-[2.5rem] flex-1 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
          />
          <Button
            type="submit"
            size="icon"
            variant="brass"
            className="h-10 w-10 shrink-0 rounded-xl"
            disabled={!selectedConversationId || blocked || !draft.trim()}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 hidden text-[0.65rem] text-muted-foreground sm:block">
          Enter to send · Shift+Enter for a new line
        </p>
      </form>
    </section>
  );

  return (
    <WorkspaceBleed className="messaging-shell">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row md:overflow-hidden">
        {listPane}
        {threadPane}
      </div>

      <ReportDialog
        open={Boolean(reporting)}
        target={reporting}
        reporterId={user?.id}
        onClose={() => setReporting(null)}
      />

      <AlertDialog open={blockConfirm} onOpenChange={setBlockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {otherName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Neither of you will be able to send messages to the other. You can unblock them from
              this thread at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void toggleBlock()}>Block</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspaceBleed>
  );
}
