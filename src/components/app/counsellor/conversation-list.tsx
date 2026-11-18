import { useEffect, useState, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { CounsellorSource } from "@/lib/assistant-sources";
import { MessageBubble } from "./message-bubble";
import type { ChatMessage } from "./types";

const VIRTUALIZE_AFTER = 28;

type Props = {
  messages: ChatMessage[];
  streamingId: string | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  followUps?: string[];
  onFollowUp?: (text: string) => void;
  onOpenSource?: (source: CounsellorSource) => void;
  sending: boolean;
  /** When false, virtualized auto-scroll to the latest message is paused. */
  stickToBottom?: boolean;
};

/**
 * Thread renderer. Short conversations stay a plain column; long ones virtualize against the
 * shared conversation scroll container so the composer layout stays unchanged.
 */
export function ConversationList({
  messages,
  streamingId,
  scrollRef,
  followUps,
  onFollowUp,
  onOpenSource,
  sending,
  stickToBottom = true,
}: Props) {
  const [ready, setReady] = useState(false);
  const useVirtual = messages.length >= VIRTUALIZE_AFTER;
  const lastId = messages.at(-1)?.id;

  useEffect(() => {
    setReady(Boolean(scrollRef.current));
  }, [scrollRef, messages.length]);

  const virtualizer = useVirtualizer({
    count: useVirtual ? messages.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 140,
    overscan: 8,
    enabled: useVirtual && ready,
  });

  useEffect(() => {
    if (!useVirtual || messages.length === 0 || !stickToBottom) return;
    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
    });
  }, [messages.length, streamingId, useVirtual, virtualizer, stickToBottom]);

  const followUpRow =
    !sending && followUps && followUps.length > 0 && messages.at(-1)?.role === "assistant" ? (
      <div className="flex flex-wrap gap-2 pt-1">
        {followUps.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={sending}
            onClick={() => onFollowUp?.(suggestion)}
            className="rounded-full border border-border/80 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-brass/40 hover:text-foreground disabled:opacity-60"
          >
            {suggestion}
          </button>
        ))}
      </div>
    ) : null;

  if (!useVirtual) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-6">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            streaming={message.id === streamingId}
            onOpenSource={onOpenSource}
            emphasizeActions={message.id === lastId && message.role === "assistant"}
          />
        ))}
        {followUpRow}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-6">
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((item) => {
          const message = messages[item.index];
          if (!message) return null;
          return (
            <div
              key={message.id}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full pb-5"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <MessageBubble
                message={message}
                streaming={message.id === streamingId}
                onOpenSource={onOpenSource}
                emphasizeActions={
                  item.index === messages.length - 1 && message.role === "assistant"
                }
              />
              {item.index === messages.length - 1 ? followUpRow : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
