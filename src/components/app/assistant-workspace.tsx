import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { BookOpen, Gavel, Loader2, Send, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, SectionHeading } from "@/components/common/bits";
import {
  adviceListQuery,
  judgementsQuery,
  publicLawyersQuery,
  newsListQuery,
  securityTipsQuery,
} from "@/lib/queries";
import { askAssistant } from "@/lib/assistant.functions";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Find a verified family lawyer in Kampala",
  "What should I do right after an arrest?",
  "How do I file a land dispute case?",
  "What's the process for reporting a stolen phone?",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AssistantWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const advice = useQuery(adviceListQuery);
  const news = useQuery(newsListQuery);
  const judgements = useQuery(judgementsQuery);
  const tips = useQuery(securityTipsQuery);
  const lawyers = useQuery(publicLawyersQuery());

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setSending(true);

    try {
      const { reply } = await askAssistant({ data: { messages: nextMessages } });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The assistant is unavailable right now.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">Legal assistant</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Assistant</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Ask a question in plain language. For anything that needs representation or a binding
        opinion, the assistant will point you to a verified advocate.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section className="flex h-[70vh] flex-col rounded-xl border border-border bg-card shadow-plate">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Sparkles className="h-8 w-8 text-brass" />
                <p className="mt-4 font-display text-lg font-semibold">Ask about anything legal</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Try one of these, or type your own question below.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={cn("max-w-2xl", message.role === "user" ? "ml-auto" : "mr-auto")}
                >
                  <div
                    className={cn(
                      "rounded-2xl border p-4",
                      message.role === "user"
                        ? "border-brass/40 bg-brass/10"
                        : "border-border bg-secondary/50",
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="mr-auto max-w-2xl">
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
            className="border-t border-border p-4"
          >
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send(draft);
                  }
                }}
                placeholder="Ask a legal question…"
                rows={2}
                disabled={sending}
                className="resize-none"
              />
              <Button type="submit" variant="brass" disabled={sending || !draft.trim()}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              General information only — not a substitute for advice from a licensed advocate.
            </p>
          </form>
        </section>

        <section className="space-y-4">
          <SectionHeading eyebrow="Quick lookup" title="Verified advocates" />
          <div className="space-y-3">
            {(lawyers.data ?? []).length === 0 ? (
              <EmptyState title="No advocates match yet" />
            ) : (
              (lawyers.data ?? []).slice(0, 3).map((lawyer) => (
                <div
                  key={lawyer.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-plate"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display font-semibold">{lawyer.full_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {lawyer.headline ?? lawyer.firm ?? "Advocate"}
                      </p>
                    </div>
                    <ShieldCheck className="h-4 w-4 shrink-0 text-brass" />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-plate">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brass" />
              <p className="font-semibold">Latest advice</p>
            </div>
            <div className="mt-3 space-y-2">
              {(advice.data ?? []).slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-md bg-secondary/40 p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-plate">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brass" />
              <p className="font-semibold">Security tips</p>
            </div>
            <div className="mt-3 space-y-2">
              {(tips.data ?? []).slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-md bg-secondary/40 p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-plate">
            <div className="flex items-center gap-2">
              <Gavel className="h-4 w-4 text-brass" />
              <p className="font-semibold">Recent judgements and news</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                {(judgements.data ?? []).slice(0, 2).map((item) => (
                  <div key={item.id} className="rounded-md bg-secondary/40 p-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.court}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {(news.data ?? []).slice(0, 2).map((item) => (
                  <div key={item.id} className="rounded-md bg-secondary/40 p-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
