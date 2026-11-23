import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Consistent signed-in page frame: soft canvas, readable max width, safe padding. */
export function WorkspaceFrame({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  /** Slightly wider canvas for admin / dense dashboards (default matches --container). */
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full px-4 py-6 sm:px-5 sm:py-8 lg:px-6 lg:py-8",
        // Keep workspaces readable on scaled Windows laptop CSS widths (~1280–1536).
        wide ? "max-w-6xl" : "max-w-5xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Page intro used across client + admin workspaces. */
export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? <p className="eyebrow text-brass">{eyebrow}</p> : null}
        <h1 className="mt-2 font-display text-h2 font-bold tracking-tight text-foreground sm:text-[2rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}

/** KPI / metric tile — ink/brass accent, used on admin + client overviews. */
export function MetricTile({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-plate transition-[border-color,box-shadow] hover:border-brass/30 hover:shadow-float",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brass/10 blur-2xl transition-opacity group-hover:opacity-100"
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {icon ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-brass ring-1 ring-brass/15 [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="relative mt-3 font-display text-3xl font-bold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      {hint ? <p className="relative mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Section card for dashboard grids. */
export function WorkspacePanel({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-5 shadow-plate sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow text-brass">{eyebrow}</p> : null}
          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
