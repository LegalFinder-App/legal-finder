import { useState, type FormEvent } from "react";
import { ArrowUpRight, Gavel, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ULII_ATTRIBUTION, ULII_COURTS, uliiCourtUrl, uliiSearchUrl } from "@/lib/legal-feed/meta";
import { delay, trackSpotlight } from "@/lib/motion";

/**
 * Search box and court-by-court links into ULII. Links only: ULII's terms forbid scraping, so
 * nothing from ulii.org is fetched or copied (docs/SOURCES.md).
 */
export function UliiJudgmentsPanel({
  initialQuery = "",
  query: controlled,
  onQueryChange,
}: {
  initialQuery?: string;
  /** Pass with onQueryChange to keep the box in step with a page-level search. */
  query?: string;
  onQueryChange?: (q: string) => void;
}) {
  const [own, setOwn] = useState(initialQuery);
  const query = controlled ?? own;
  const setQuery = onQueryChange ?? setOwn;
  const search = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) window.open(uliiSearchUrl(query), "_blank", "noopener,noreferrer");
  };
  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <div className="relative isolate surface-ink p-6 sm:p-8">
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-50" />
          <p className="eyebrow text-brass">Court judgments</p>
          <h2 className="mt-2 text-h4 font-bold text-ink-foreground">
            Read judgments on ULII, Uganda's free law library
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-foreground/75">
            Search reported decisions from every superior court. Results open on ULII in a new tab.
          </p>
          <form onSubmit={search} className="mt-5 flex flex-col gap-2 sm:flex-row" role="search">
            <label htmlFor="ulii-q" className="sr-only">
              Search judgments on ULII
            </label>
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-foreground/50"
                aria-hidden
              />
              <input
                id="ulii-q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. land title, bail, election petition"
                className="h-12 w-full rounded-full border pl-11 pr-4 text-base text-ink-foreground placeholder:text-ink-foreground/50 surface-glass-ink focus:border-brass focus:outline-none focus:ring-[3px] focus:ring-brass/25 sm:text-sm"
              />
            </div>
            <Button type="submit" variant="brass" size="lg" className="h-12">
              Search ULII <ArrowUpRight />
            </Button>
          </form>
        </div>
      </section>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ULII_COURTS.map((c, i) => (
          <li key={c.code} className="animate-rise min-w-0" style={delay(i * 60)}>
            <a
              href={uliiCourtUrl(c.code)}
              target="_blank"
              rel="noreferrer"
              onPointerMove={trackSpotlight}
              style={{ "--spot-size": "360px" } as React.CSSProperties}
              className="card-glow spotlight group flex h-full min-h-44 flex-col overflow-hidden p-5 sm:p-6"
            >
              {/* The court's ULII code as a quiet watermark. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-4 -right-2 select-none font-mono text-[4.5rem] font-black leading-none tracking-tighter text-foreground/[0.045] transition-transform duration-700 ease-(--ease-out-expo) group-hover:-translate-x-1 group-hover:-translate-y-1"
              >
                {c.code.replace(/^UG/, "")}
              </span>
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-[image:var(--gradient-brass)] transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-x-100"
              />
              <span className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl surface-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.12),0_6px_16px_-6px_oklch(0.2_0.05_262/0.6)]">
                  <Gavel className="h-5 w-5 text-brass" aria-hidden />
                </span>
                <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 font-mono text-[0.68rem] font-semibold tracking-wide text-muted-foreground backdrop-blur">
                  {c.code}
                </span>
              </span>
              <span className="mt-4 block text-lg font-bold leading-tight tracking-[-0.015em]">
                {c.name}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                {c.note}
              </span>
              <span aria-hidden className="min-h-3 flex-1" />
              <span className="relative mt-4 inline-flex items-center gap-2 text-sm font-semibold">
                Browse judgments
                <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary transition-[transform,background-color,color] duration-500 ease-(--ease-out-expo) group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-[image:var(--gradient-brass)] group-hover:text-[oklch(0.22_0.04_70)]">
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </span>
              <span className="sr-only"> on ULII (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {ULII_ATTRIBUTION}. Links open ULII's own pages; LegalFinder does not copy ULII content.
      </p>
    </div>
  );
}
