import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, HelpCircle, PanelRightOpen, Sparkles } from "lucide-react";
import { toast } from "@/lib/toast";
import type { CounsellorAdvocate } from "@/lib/assistant-advocates";
import type { CounsellorAttachment } from "@/lib/assistant-attachments";
import type { CounsellorSource } from "@/lib/assistant-sources";
import { streamCounsellorReply } from "@/lib/assistant-stream";
import { useSession } from "@/lib/session";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ConversationList } from "./conversation-list";
import { MessageComposer } from "./composer";
import { SourcePanel } from "./source-panel";
import { SourcePreview } from "./citation";
import { ResearchPanel } from "./research-panel";
import { CounsellorSidebar } from "./sidebar";
import {
  loadConversations,
  loadResearchHistory,
  saveConversations,
  saveResearchHistory,
  type ResearchHistoryEntry,
} from "./storage";
import { ThinkingIndicator } from "./thinking-indicator";
import {
  newId,
  titleFromPrompt,
  type ChatMessage,
  type Conversation,
  type CounsellorMode,
} from "./types";
import { CounsellorSettingsDialog } from "./settings-dialog";
import { WelcomeScreen } from "./welcome";

const FOLLOW_UPS = [
  "Explain that in simpler terms",
  "What should I do next?",
  "Point me to a verified advocate",
];

const RESEARCH_FOLLOW_UPS = [
  "Compare the cited sources",
  "What statute should I read next?",
  "Summarise the strongest judgment",
];

const NEAR_BOTTOM_PX = 96;

function emptyConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: "New conversation",
    updatedAt: now,
    messages: [],
  };
}

export function CounsellorWorkspace() {
  const { user } = useSession();
  const userId = user?.id ?? null;

  const [hydrated, setHydrated] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<CounsellorAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState("Understanding your question");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<CounsellorMode>("assistant");
  const [researchOpen, setResearchOpen] = useState(true);
  const [researchHistory, setResearchHistory] = useState<ResearchHistoryEntry[]>([]);
  const [panelSource, setPanelSource] = useState<CounsellorSource | null>(null);
  const [lastResearchQuery, setLastResearchQuery] = useState("");
  const [dialog, setDialog] = useState<"settings" | "help" | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [showJump, setShowJump] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickRef = useRef(true);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const stored = loadConversations(userId);
    if (stored.length > 0) {
      setConversations(stored);
      setActiveId(stored[0]?.id ?? null);
    } else {
      const first = emptyConversation();
      setConversations([first]);
      setActiveId(first.id);
    }
    setResearchHistory(loadResearchHistory(userId));
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;
    saveConversations(userId, conversations);
  }, [conversations, hydrated, userId]);

  useEffect(() => {
    if (!hydrated) return;
    saveResearchHistory(userId, researchHistory);
  }, [researchHistory, hydrated, userId]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (mode === "research") setResearchOpen(true);
  }, [mode]);

  useEffect(() => {
    stickRef.current = true;
    setStickToBottom(true);
    setShowJump(false);
  }, [activeId]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0] ?? null,
    [conversations, activeId],
  );
  const messages = active?.messages ?? [];

  const scrollToLatest = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : behavior });
    stickRef.current = true;
    setStickToBottom(true);
    setShowJump(false);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distance <= NEAR_BOTTOM_PX;
    stickRef.current = near;
    setStickToBottom(near);
    setShowJump(!near && messages.length > 0);
  }, [messages.length]);

  useEffect(() => {
    if (!stickRef.current) {
      setShowJump(messages.length > 0);
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, sending, streamingId, activeId, statusLabel]);

  const startNew = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
    setStreamingId(null);
    const next = emptyConversation();
    setConversations((prev) => [next, ...prev]);
    setActiveId(next.id);
    setDraft("");
    setAttachments([]);
    setSidebarOpen(false);
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
    setStreamingId(null);
  };

  const appendToAssistant = (conversationId: string, assistantId: string, chunk: string) => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;
        return {
          ...conversation,
          updatedAt: new Date().toISOString(),
          messages: conversation.messages.map((message) =>
            message.id === assistantId
              ? { ...message, content: `${message.content}${chunk}` }
              : message,
          ),
        };
      }),
    );
  };

  const attachSources = (
    conversationId: string,
    assistantId: string,
    sources: CounsellorSource[],
  ) => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;
        return {
          ...conversation,
          messages: conversation.messages.map((message) =>
            message.id === assistantId ? { ...message, sources } : message,
          ),
        };
      }),
    );
  };

  const attachAdvocates = (
    conversationId: string,
    assistantId: string,
    advocates: CounsellorAdvocate[],
  ) => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;
        return {
          ...conversation,
          messages: conversation.messages.map((message) =>
            message.id === assistantId ? { ...message, advocates } : message,
          ),
        };
      }),
    );
  };

  const activeSources = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    return lastAssistant?.sources ?? [];
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? draft).trim();
    const pendingAttachments = text ? [] : attachments;
    if ((!content && pendingAttachments.length === 0) || sending || !active) return;

    const promptText =
      content ||
      (pendingAttachments.length > 0
        ? "Please review the attached file and explain anything legally relevant in plain language."
        : "");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMessage: ChatMessage = {
      id: newId(),
      role: "user",
      content: promptText,
      createdAt: new Date().toISOString(),
      attachments: pendingAttachments.length ? pendingAttachments : undefined,
    };
    const assistantId = newId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];
    const titled =
      messages.length === 0
        ? {
            ...active,
            title: titleFromPrompt(
              content || pendingAttachments[0]?.name || "Attachment review",
            ),
            updatedAt: userMessage.createdAt,
          }
        : { ...active, updatedAt: userMessage.createdAt };

    const conversationId = active.id;
    stickRef.current = true;
    setStickToBottom(true);
    setShowJump(false);
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? { ...titled, messages: [...nextMessages, assistantMessage] }
          : conversation,
      ),
    );
    setDraft("");
    setAttachments([]);
    setSending(true);
    setStreamingId(assistantId);
    setStatusLabel("Understanding your question");
    if (mode === "research") {
      setLastResearchQuery(promptText);
      setResearchOpen(true);
    }

    try {
      const payload = nextMessages.map(({ role, content: body }) => ({ role, content: body }));
      let sawDelta = false;

      await streamCounsellorReply(payload, {
        signal: controller.signal,
        mode,
        attachments: pendingAttachments,
        onStatus: (label) => setStatusLabel(label),
        onSources: (sources) => attachSources(conversationId, assistantId, sources),
        onAdvocates: (advocates) => attachAdvocates(conversationId, assistantId, advocates),
        onDelta: (chunk) => {
          sawDelta = true;
          appendToAssistant(conversationId, assistantId, chunk);
        },
        onDone: () => {
          // Status cleared in finally.
        },
      });

      if (!sawDelta && !controller.signal.aborted) {
        appendToAssistant(
          conversationId,
          assistantId,
          "I didn't get a response — please try again.",
        );
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        toast.error(
          error instanceof Error ? error.message : "Counsellor AI is unavailable right now.",
        );
      }
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          const last = conversation.messages.at(-1);
          if (last?.id === assistantId && !last.content) {
            return { ...conversation, messages: conversation.messages.slice(0, -1) };
          }
          return conversation;
        }),
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setSending(false);
      setStreamingId(null);
    }
  };

  if (!hydrated || !active) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-brass/20" aria-hidden />
      </div>
    );
  }

  const showThinking = sending && !messages.some((m) => m.id === streamingId && m.content);
  const followUps = mode === "research" ? RESEARCH_FOLLOW_UPS : FOLLOW_UPS;
  const researchPanelProps = {
    open: true as const,
    onOpenChange: setResearchOpen,
    seededQuery: lastResearchQuery,
    seededSources: activeSources,
    history: researchHistory,
    onHistoryChange: setResearchHistory,
    onOpenSource: setPanelSource,
    onAskAboutSource: (source: CounsellorSource) => {
      void send(
        `Please explain this LegalFinder ${source.kind} in plain language and how it may apply: "${source.title}".${
          source.summary ? ` Summary: ${source.summary}` : ""
        }`,
      );
    },
    onUseInChat: (query: string) => setDraft(query),
  };

  return (
    <div className="counsellor-shell relative flex h-[calc(100dvh-4.5rem)] min-h-[560px] overflow-hidden rounded-none border-y border-border/70 bg-[linear-gradient(180deg,hsl(var(--secondary)/0.35)_0%,hsl(var(--background))_28%)] sm:mx-3 sm:my-3 sm:h-[calc(100dvh-5.5rem)] sm:rounded-2xl sm:border lg:mx-4">
      <CounsellorSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        conversations={[...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))}
        activeId={active.id}
        search={search}
        onSearchChange={setSearch}
        onSelect={(id) => {
          if (sending) stop();
          setActiveId(id);
        }}
        onNew={startNew}
        onTogglePin={(id) =>
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)),
          )
        }
        mode={mode}
        onModeChange={setMode}
        onOpenSettings={() => setDialog("settings")}
        onOpenHelp={() => setDialog("help")}
      />

      <section className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border/70 bg-card/80 px-4 py-3.5 backdrop-blur-md sm:px-6 sm:py-3 lg:pl-5">
          <div className="min-w-0 pl-11 lg:pl-0">
            <div className="flex items-center gap-2">
              <Sparkles className="hidden h-4 w-4 text-brass sm:block" aria-hidden />
              <h1 className="truncate font-display text-base font-semibold tracking-tight sm:text-lg">
                {messages.length === 0
                  ? mode === "research"
                    ? "Legal Research"
                    : "Counsellor AI"
                  : active.title}
              </h1>
              {mode === "research" && (
                <span className="hidden rounded-full border border-brass/30 bg-brass/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brass sm:inline">
                  Research
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {mode === "research" ? "Split research workspace" : "Everyday legal assistant"}
              {sending ? " · drafting" : " · ready"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {mode === "research" && (
              <button
                type="button"
                onClick={() => setResearchOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground lg:hidden"
                aria-expanded={researchOpen}
                aria-controls="counsellor-research-sheet"
              >
                <PanelRightOpen className="h-3.5 w-3.5" />
                Sources
              </button>
            )}
            <button
              type="button"
              onClick={() => setDialog("help")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Counsellor AI help"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              <div
                ref={scrollRef}
                onScroll={onScroll}
                className="absolute inset-0 overflow-y-auto px-3 py-4 sm:px-6"
              >
                {messages.length === 0 ? (
                  <WelcomeScreen
                    onSend={(text) => void send(text)}
                    sending={sending}
                    researchMode={mode === "research"}
                  />
                ) : (
                  <>
                    <ConversationList
                      messages={messages}
                      streamingId={streamingId}
                      scrollRef={scrollRef}
                      followUps={followUps}
                      onFollowUp={(text) => void send(text)}
                      onOpenSource={setPanelSource}
                      sending={sending}
                      stickToBottom={stickToBottom}
                    />
                    {showThinking && (
                      <div className="mx-auto max-w-3xl">
                        <ThinkingIndicator label={statusLabel} />
                      </div>
                    )}
                  </>
                )}
              </div>

              {(showJump || (!stickToBottom && (sending || Boolean(streamingId)))) && (
                <button
                  type="button"
                  onClick={() => scrollToLatest()}
                  className="counsellor-jump absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/80 bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-md transition-colors hover:border-brass/40"
                >
                  <ArrowDown className="h-3.5 w-3.5 text-brass" />
                  Jump to latest
                </button>
              )}
            </div>

            <div className="border-t border-border/70 bg-card/80 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:px-6">
              <div className="mx-auto max-w-3xl">
                <MessageComposer
                  value={draft}
                  onChange={setDraft}
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  onSend={() => void send()}
                  onStop={stop}
                  sending={sending}
                  autoFocus={messages.length === 0}
                  placeholder={
                    mode === "research"
                      ? "Ask a research question about Ugandan law…"
                      : "Ask a question, or attach a document to review…"
                  }
                />
              </div>
            </div>
          </div>

          {mode === "research" && (
            <div
              className={
                researchOpen
                  ? "relative hidden min-h-0 shrink-0 lg:flex lg:flex-col"
                  : "relative hidden lg:block"
              }
            >
              <ResearchPanel {...researchPanelProps} open={researchOpen} />
            </div>
          )}
        </div>
      </section>

      {mode !== "research" && (
        <SourcePanel mode={mode} sources={activeSources} onOpenSource={setPanelSource} />
      )}

      {mode === "research" && isNarrow && (
        <Sheet open={researchOpen} onOpenChange={setResearchOpen}>
          <SheetContent
            id="counsellor-research-sheet"
            side="bottom"
            className="flex h-[min(92dvh,44rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
          >
            <SheetTitle className="sr-only">Legal Research</SheetTitle>
            <SheetDescription className="sr-only">
              Search judgments, library texts and guides for Counsellor AI.
            </SheetDescription>
            <div className="min-h-0 flex-1 overflow-hidden pt-2">
              <ResearchPanel {...researchPanelProps} variant="sheet" />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <SourcePreview
        source={panelSource}
        open={Boolean(panelSource)}
        onOpenChange={(open) => {
          if (!open) setPanelSource(null);
        }}
      />
      <CounsellorSettingsDialog
        open={dialog === "settings"}
        onOpenChange={(open) => setDialog(open ? "settings" : null)}
        variant="settings"
      />
      <CounsellorSettingsDialog
        open={dialog === "help"}
        onOpenChange={(open) => setDialog(open ? "help" : null)}
        variant="help"
      />
    </div>
  );
}

/** Kept for any import that still expects the old name. */
export { CounsellorWorkspace as AssistantWorkspace };
