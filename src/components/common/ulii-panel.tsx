import { useState, type FormEvent } from "react";
import { ArrowUpRight, Gavel, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ULII_ATTRIBUTION, ULII_COURTS, uliiCourtUrl, uliiSearchUrl } from "@/lib/legal-feed/meta";
import { delay } from "@/lib/motion";

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

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ULII_COURTS.map((c, i) => (
          <li key={c.code} className="animate-rise" style={delay(i * 50)}>
            <a
              href={uliiCourtUrl(c.code)}
              target="_blank"
              rel="noreferrer"
              className="card card-interactive group flex h-full items-center gap-4 p-4"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-brass">
                <Gavel className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold tracking-tight group-hover:text-brass">
                  {c.name}
                </span>
                <span className="block text-xs text-muted-foreground">{c.note}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brass">
                View on ULII <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </span>
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
