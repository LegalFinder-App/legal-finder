import { useEffect, useState } from "react";
import { FileText, ShieldCheck, X, ZoomIn } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { CounsellorAdvocate } from "@/lib/assistant-advocates";
import { formatBytes, type CounsellorAttachment } from "@/lib/assistant-attachments";
import { cn } from "@/lib/utils";

export function AttachmentPreviewStrip({
  items,
  uploading,
  onRemove,
}: {
  items: CounsellorAttachment[];
  uploading?: boolean;
  onRemove?: (id: string) => void;
}) {
  if (items.length === 0 && !uploading) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2 px-2 pt-1">
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative flex max-w-[12rem] items-center gap-2 rounded-xl border border-border/80 bg-secondary/50 p-1.5 pr-8"
        >
          {item.kind === "image" ? (
            <img
              src={item.url}
              alt=""
              className="h-10 w-10 rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brass/15 text-brass">
              <FileText className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{item.name}</p>
            <p className="text-[10px] text-muted-foreground">{formatBytes(item.size)}</p>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="absolute right-1 top-1 rounded-md p-1 text-muted-foreground opacity-70 hover:bg-background hover:opacity-100"
              aria-label={`Remove ${item.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {uploading && (
        <div className="flex h-[3.25rem] items-center rounded-xl border border-dashed border-border px-3 text-xs text-muted-foreground">
          Uploading…
        </div>
      )}
    </div>
  );
}

export function MessageAttachments({
  attachments,
  onOpenImage,
}: {
  attachments: CounsellorAttachment[];
  onOpenImage?: (attachment: CounsellorAttachment, index: number) => void;
}) {
  if (!attachments.length) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {attachments.map((item, index) =>
        item.kind === "image" ? (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenImage?.(item, index)}
            className="group relative overflow-hidden rounded-xl border border-border/80 bg-secondary/40"
          >
            <img
              src={item.url}
              alt={item.name}
              className="h-28 w-40 object-cover transition-transform group-hover:scale-[1.02]"
              loading="lazy"
            />
            <span className="absolute bottom-1.5 right-1.5 rounded-md bg-ink/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="h-3.5 w-3.5" />
            </span>
          </button>
        ) : (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-[12rem] max-w-[16rem] items-start gap-2.5 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-colors hover:border-brass/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brass/15 text-brass">
              <FileText className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{item.name}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                PDF · {formatBytes(item.size)}
              </span>
            </span>
          </a>
        ),
      )}
    </div>
  );
}

export function ImageLightbox({
  images,
  index,
  open,
  onOpenChange,
  onIndexChange,
}: {
  images: CounsellorAttachment[];
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}) {
  const current = images[index];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
      if (event.key === "ArrowRight") onIndexChange(Math.min(images.length - 1, index + 1));
      if (event.key === "ArrowLeft") onIndexChange(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, images.length, onIndexChange, onOpenChange]);

  if (!open || !current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={current.name}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close image preview"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-sm text-ink-foreground">
          <div className="min-w-0">
            <p className="truncate font-medium">{current.name}</p>
            <p className="text-xs opacity-80">
              {index + 1} / {images.length} · {formatBytes(current.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg bg-white/10 p-2 hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <img
          src={current.url}
          alt={current.name}
          className="max-h-[75vh] w-full rounded-2xl object-contain bg-black/30"
        />
        {images.length > 1 && (
          <div className="flex justify-between">
            <button
              type="button"
              className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-white disabled:opacity-40"
              disabled={index === 0}
              onClick={() => onIndexChange(index - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/20 px-3 py-1.5 text-sm text-white disabled:opacity-40"
              disabled={index >= images.length - 1}
              onClick={() => onIndexChange(index + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdvocateProfileCard({ advocate }: { advocate: CounsellorAdvocate }) {
  const [failed, setFailed] = useState(false);
  return (
    <Link
      to="/lawyers/$lawyerId"
      params={{ lawyerId: advocate.id }}
      className="flex gap-3 rounded-2xl border border-border/80 bg-card/95 p-3.5 shadow-sm transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-md"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
        {advocate.photoUrl && !failed ? (
          <img
            src={advocate.photoUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
            {advocate.fullName
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("")}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-sm font-semibold leading-snug">{advocate.fullName}</p>
          {advocate.verified && (
            <ShieldCheck className="h-4 w-4 shrink-0 text-brass" aria-label="Verified" />
          )}
        </div>
        {(advocate.headline || advocate.bio) && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {advocate.headline || advocate.bio}
          </p>
        )}
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {[advocate.city, advocate.county].filter(Boolean).join(", ") || "Uganda"}
          {advocate.practiceAreas.length > 0
            ? ` · ${advocate.practiceAreas.slice(0, 2).join(", ")}`
            : ""}
          {advocate.consultationFee != null && advocate.consultationFee > 0
            ? ` · from UGX ${Math.round(advocate.consultationFee).toLocaleString("en-UG")}`
            : ""}
        </p>
      </div>
    </Link>
  );
}

export function AdvocateCardRow({ advocates }: { advocates: CounsellorAdvocate[] }) {
  if (!advocates.length) return null;
  return (
    <div className={cn("mt-3 space-y-2")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Verified advocates
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {advocates.map((advocate) => (
          <AdvocateProfileCard key={advocate.id} advocate={advocate} />
        ))}
      </div>
    </div>
  );
}
