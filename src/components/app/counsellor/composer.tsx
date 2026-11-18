import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, Square } from "lucide-react";
import { toast } from "@/lib/toast";
import { uploadAssistantAttachment } from "@/lib/imagekit";
import {
  MAX_ATTACHMENTS,
  type CounsellorAttachment,
} from "@/lib/assistant-attachments";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AttachmentPreviewStrip } from "./media";
import { newId } from "./types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  attachments: CounsellorAttachment[];
  onAttachmentsChange: (attachments: CounsellorAttachment[]) => void;
  onSend: () => void;
  onStop?: () => void;
  sending: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /** Hide paperclip when attachments aren't offered (e.g. welcome can still show them). */
  allowAttachments?: boolean;
};

export function MessageComposer({
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  onSend,
  onStop,
  sending,
  placeholder = "Ask Counsellor AI a legal question…",
  autoFocus,
  className,
  allowAttachments = true,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const canSend = Boolean(value.trim() || attachments.length > 0);

  const pickFiles = async (files: FileList | File[] | null) => {
    if (!files?.length || uploading) return;
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      toast.error(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      return;
    }

    setUploading(true);
    try {
      const next = [...attachments];
      const list = Array.from(files).slice(0, remaining);
      for (const file of list) {
        const uploaded = await uploadAssistantAttachment(file);
        next.push({ id: newId(), ...uploaded });
      }
      onAttachmentsChange(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (sending || uploading || !canSend) return;
          onSend();
        }}
        onDragEnter={(event) => {
          if (!allowAttachments) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!allowAttachments) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(event) => {
          if (!allowAttachments) return;
          event.preventDefault();
          setDragging(false);
          void pickFiles(event.dataTransfer.files);
        }}
        className={cn(
          "counsellor-composer rounded-2xl border bg-card/95 p-2 shadow-card backdrop-blur-md transition-[border-color,box-shadow,background-color]",
          dragging
            ? "border-brass/55 bg-brass/5 shadow-glow"
            : "border-border/80 focus-within:border-brass/45 focus-within:shadow-raised",
        )}
      >
        <AttachmentPreviewStrip
          items={attachments}
          uploading={uploading}
          onRemove={(id) => onAttachmentsChange(attachments.filter((a) => a.id !== id))}
        />
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!sending && !uploading && canSend) onSend();
            }
          }}
          rows={1}
          disabled={sending}
          placeholder={placeholder}
          aria-label="Message to Counsellor AI"
          aria-describedby="counsellor-composer-hint"
          className="max-h-[180px] min-h-[48px] w-full resize-none bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-0.5">
          <div className="flex items-center gap-2">
            {allowAttachments && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                  multiple
                  className="hidden"
                  onChange={(event) => void pickFiles(event.target.files)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={sending || uploading || attachments.length >= MAX_ATTACHMENTS}
                  className="h-8 gap-1.5 rounded-xl px-2 text-muted-foreground"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Attach image or PDF"
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="hidden sm:inline">Attach</span>
                </Button>
              </>
            )}
            <p id="counsellor-composer-hint" className="text-[11px] leading-snug text-muted-foreground">
              {dragging
                ? "Drop files to attach"
                : "Enter to send · Shift+Enter for a new line"}
            </p>
          </div>
          {sending ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onStop}
              className="min-w-10 gap-1.5 rounded-xl px-3"
              aria-label="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span className="hidden sm:inline">Stop</span>
            </Button>
          ) : (
            <Button
              type="submit"
              variant="brass"
              size="sm"
              disabled={!canSend || uploading}
              className="min-w-10 gap-1.5 rounded-xl px-3"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          )}
        </div>
      </form>
      <p className="mt-2 px-1 text-center text-[11px] leading-relaxed text-muted-foreground">
        Counsellor AI can make mistakes. Verify important legal information with a qualified
        advocate. Attached files are sent to Anthropic to answer your question.
      </p>
    </div>
  );
}
