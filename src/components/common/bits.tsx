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
        <h2 className="mt-2 text-3xl font-semibold leading-tight lg:text-[2.5rem]">{title}</h2>
        {description && (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${value} of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i <= Math.round(value) ? "fill-brass text-brass" : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      {icon && <div className="mb-4 text-muted-foreground/60">{icon}</div>}
      <p className="font-display text-lg font-semibold">{title}</p>
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
    <div className="rounded-lg border border-border bg-card p-5 shadow-plate">
      <div className="flex items-start justify-between">
        <p className="eyebrow text-muted-foreground">{label}</p>
        {icon && <span className="text-brass">{icon}</span>}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/70" />
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
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 text-sm font-medium text-brass hover:underline"
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
