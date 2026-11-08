import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDownUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolbarTab = { id: string; label: string; count?: number };
export type SortOption = { id: string; label: string };

/**
 * Shared toolbar for public listings (library, judgements, news, advice): tabs with counts and
 * a sliding indicator, a sort menu and the result count. Tabs scroll sideways on phones.
 */
export function ListingToolbar({
  tabs,
  tab,
  onTab,
  sorts,
  sort,
  onSort,
  resultLabel,
  trailing,
  label = "Filter",
}: {
  tabs?: ToolbarTab[];
  tab?: string;
  onTab?: (id: string) => void;
  sorts?: SortOption[];
  sort?: string;
  onSort?: (id: string) => void;
  resultLabel?: string;
  trailing?: ReactNode;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {tabs && tabs.length > 1 && tab !== undefined && onTab ? (
        <SlidingTabs tabs={tabs} value={tab} onChange={onTab} label={label} />
      ) : (
        <span />
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 md:shrink-0 md:flex-nowrap md:justify-end">
        {resultLabel && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {resultLabel}
          </p>
        )}
        <div className="ml-auto flex items-center gap-2">
          {sorts && sort && onSort && (
            <label className="relative">
              <span className="sr-only">Sort</span>
              <ArrowDownUp
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <select
                value={sort}
                onChange={(e) => onSort(e.target.value)}
                className="h-10 cursor-pointer appearance-none rounded-full border border-border bg-card pl-10 pr-5 text-sm font-semibold shadow-xs transition-colors hover:border-foreground/25 focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20"
              >
                {sorts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {trailing}
        </div>
      </div>
    </div>
  );
}

function SlidingTabs({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: ToolbarTab[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[value];
      if (el) setBox({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, tabs.length]);

  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 min-w-0 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(90deg,#000_calc(100%-1.5rem),transparent)] [scrollbar-width:none] sm:mx-0 sm:px-0 sm:pb-0"
    >
      <div className="relative inline-flex gap-1 rounded-full border border-border bg-card p-1 shadow-xs">
        {box && (
          <span
            aria-hidden
            className="absolute bottom-1 top-1 rounded-full bg-primary shadow-xs transition-[transform,width] duration-300 ease-(--ease-out-expo)"
            style={{ width: box.w, transform: `translateX(${box.x}px)`, left: 0 }}
          />
        )}
        {tabs.map((t) => {
          const active = value === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(t.id)}
              className={cn(
                "relative z-10 inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors duration-200",
                active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                active && !box && "bg-primary",
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[0.68rem] tabular-nums",
                    active ? "bg-white/15" : "bg-secondary",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A row of live figures under a page title. */
export function StatStrip({
  items,
  loading,
  tone = "light",
}: {
  items: { icon: LucideIcon; label: string; value: ReactNode }[];
  loading?: boolean;
  tone?: "light" | "ink";
}) {
  return (
    <ul
      className={cn(
        // An odd last tile spans the row on phones instead of sitting alone at half width.
        "grid grid-cols-2 gap-2 sm:gap-3 [&>li:last-child:nth-child(odd)]:col-span-2 sm:[&>li:last-child:nth-child(odd)]:col-span-1",
        items.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3",
      )}
    >
      {items.map((s) => (
        <li
          key={s.label}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-2xl p-3",
            tone === "ink"
              ? "surface-glass-ink"
              : "border border-border bg-card/70 shadow-xs backdrop-blur",
          )}
        >
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
              tone === "ink" ? "bg-white/10 text-brass" : "bg-accent text-brass",
            )}
          >
            <s.icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col-reverse">
            <span
              className={cn(
                "mt-1 truncate text-[0.7rem]",
                tone === "ink" ? "text-ink-foreground/65" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            <span
              className={cn(
                "truncate text-lg font-bold leading-none tabular-nums",
                tone === "ink" && "text-ink-foreground",
              )}
            >
              {loading ? "—" : s.value}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
