import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
        {eyebrow && <p className="eyebrow text-brass">{eyebrow}</p>}
        <h2 className="mt-3 text-h2 font-bold">{title}</h2>
        {description && (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-[1.0625rem]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      role="img"
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i <= Math.round(value) ? "fill-gold text-gold" : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

export function EmptyState({
  icon,
  imageUrl,
  imageAlt,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  /** Optional site_media illustration — takes precedence over `icon` when present. */
  imageUrl?: string;
  imageAlt?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt ?? ""}
          loading="lazy"
          className="mb-5 h-28 w-28 rounded-full object-cover shadow-plate ring-1 ring-brass/20"
        />
      ) : (
        icon && (
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground [&_svg]:h-6 [&_svg]:w-6">
            {icon}
          </div>
        )
      )}
      <p className="font-display text-lg font-bold tracking-tight">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-plate">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow text-muted-foreground">{label}</p>
        {icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-brass [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex h-20 items-center gap-4 rounded-2xl border border-border bg-card px-5"
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function QueryError({
  title = "Unable to load data",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-3xl border border-destructive/25 bg-destructive/5 px-6 py-10 text-center"
    >
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="press mt-5 inline-flex h-10 items-center rounded-full border border-border bg-card px-5 text-sm font-semibold hover:bg-secondary"
        >
          Try again
        </button>
      )}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  open: "bg-success/15 text-success",
  active: "bg-success/15 text-success",
  confirmed: "bg-success/15 text-success",
  insert: "bg-success/15 text-success",
  resolved: "bg-muted text-muted-foreground",
  closed: "bg-muted text-muted-foreground",
  completed: "bg-muted text-muted-foreground",
  pending: "bg-warning/20 text-warning-foreground",
  investigating: "bg-warning/20 text-warning-foreground",
  update: "bg-warning/20 text-warning-foreground",
  urgent: "bg-destructive/15 text-destructive",
  high: "bg-destructive/15 text-destructive",
  cancelled: "bg-destructive/15 text-destructive",
  delete: "bg-destructive/15 text-destructive",
};

export function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold capitalize",
        STATUS_TONE[value.toLowerCase()] ?? "bg-secondary text-secondary-foreground",
      )}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}
