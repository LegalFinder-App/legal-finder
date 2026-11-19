import { Copy, Check } from "lucide-react";
import { useMemo, useState } from "react";
import type { CounsellorAttachment } from "@/lib/assistant-attachments";
import { resolveSourcesFromText, type CounsellorSource } from "@/lib/assistant-sources";
import { cn } from "@/lib/utils";
import { AssistantMarkdown } from "./assistant-markdown";
import { CitationCard, SourcePreview } from "./citation";
import { GroundingPill } from "./grounding-pill";
import { AdvocateCardRow, ImageLightbox, MessageAttachments } from "./media";
import type { ChatMessage } from "./types";

export function MessageBubble({
  message,
  streaming = false,
  onOpenSource,
  emphasizeActions = false,
}: {
  message: ChatMessage;
  streaming?: boolean;
  onOpenSource?: (source: CounsellorSource) => void;
  /** Keep Copy visible on touch / last assistant turn. */
  emphasizeActions?: boolean;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<CounsellorSource | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openSource = (source: CounsellorSource) => {
    setPreview(source);
    onOpenSource?.(source);
  };

  const cited = useMemo(
    () => resolveSourcesFromText(message.content, message.sources),
    [message.content, message.sources],
  );
  const related = useMemo(() => {
    if (!message.sources?.length) return [];
    const citedKeys = new Set(cited.map((s) => `${s.kind}:${s.id}`));
    return message.sources.filter((s) => !citedKeys.has(`${s.kind}:${s.id}`)).slice(0, 4);
  }, [cited, message.sources]);

  const imageAttachments = useMemo(
    () => (message.attachments ?? []).filter((a) => a.kind === "image"),
    [message.attachments],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        message.content.replace(
          /\[\[cite:(advice|judgment|library|news):([a-zA-Z0-9_-]+)\]\]/g,
          "",
        ),
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard may be blocked.
    }
  };

  const openImage = (_attachment: CounsellorAttachment, index: number) => {
    const absolute = imageAttachments.findIndex(
      (img) => img.id === (message.attachments ?? []).filter((a) => a.kind === "image")[index]?.id,
    );
    setLightboxIndex(absolute >= 0 ? absolute : 0);
    setLightboxOpen(true);
  };

  return (
    <div
      className={cn(
        "counsellor-msg-in group flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div className={cn("w-full", isUser ? "max-w-[min(42rem,100%)]" : "max-w-[min(46rem,100%)]")}>
        <div
          className={cn(
            "relative rounded-2xl border px-4 py-3.5 shadow-sm",
            isUser
              ? "border-brass/35 bg-brass/12 text-foreground"
              : "border-border/80 bg-card/95 text-foreground backdrop-blur-sm",
            streaming && "ring-1 ring-brass/25",
          )}
        >
          {!isUser && (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">
                  Counsellor AI
                </p>
                {(message.sources?.length ?? 0) > 0 ? (
                  <GroundingPill grounded />
                ) : !streaming ? (
                  <GroundingPill grounded={false} />
                ) : null}
              </div>
              {streaming && (
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Writing
                </span>
              )}
            </div>
          )}

          {isUser && message.attachments && message.attachments.length > 0 && (
            <MessageAttachments
              attachments={message.attachments}
              onOpenImage={(attachment) => {
                const idx = imageAttachments.findIndex((img) => img.id === attachment.id);
                setLightboxIndex(idx >= 0 ? idx : 0);
                setLightboxOpen(true);
              }}
            />
          )}

          {isUser ? (
            message.content ? (
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
            ) : null
          ) : message.content ? (
            <div className="relative">
              <AssistantMarkdown
                text={message.content}
                sources={message.sources}
                onOpenSource={openSource}
              />
              {streaming && (
                <span
                  className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse bg-brass align-baseline"
                  aria-hidden
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Drafting…</p>
          )}
          {!isUser && !streaming && message.content && (
            <button
              type="button"
              onClick={() => void copy()}
              className={cn(
                "absolute -bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-border bg-background/95 px-2 py-1 text-[11px] text-muted-foreground shadow-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100",
                emphasizeActions ? "opacity-100" : "opacity-0",
              )}
              aria-label={copied ? "Copied" : "Copy reply"}
            >
              {copied ? <Check className="h-3 w-3 text-brass" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>

        {!isUser && !streaming && message.advocates && message.advocates.length > 0 && (
          <AdvocateCardRow advocates={message.advocates} />
        )}

        {!isUser && !streaming && (cited.length > 0 || related.length > 0) && (
          <div className="mt-3 space-y-3">
            {cited.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Cited sources
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {cited.map((source, i) => (
                    <CitationCard
                      key={`${source.kind}-${source.id}`}
                      source={source}
                      index={i + 1}
                      onOpen={openSource}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}
            {related.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Related on LegalFinder
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {related.map((source) => (
                    <CitationCard
                      key={`${source.kind}-${source.id}`}
                      source={source}
                      onOpen={openSource}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Guides are editorial. Judgments, legislation and headlines are labelled honestly —
              verify against the original when it matters.
            </p>
          </div>
        )}
      </div>

      <SourcePreview
        source={preview}
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      />
      <ImageLightbox
        images={imageAttachments}
        index={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
