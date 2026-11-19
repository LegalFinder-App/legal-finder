import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Gavel, Newspaper, ShieldCheck, Users } from "lucide-react";
import { EmptyState, SectionHeading } from "@/components/common/bits";
import { Skeleton } from "@/components/ui/skeleton";
import type { CounsellorSource } from "@/lib/assistant-sources";
import { adviceListQuery, judgementsQuery, publicLawyersQuery } from "@/lib/queries";
import { CitationCard } from "./citation";
import type { CounsellorMode } from "./types";

type Props = {
  mode: CounsellorMode;
  sources: CounsellorSource[];
  onOpenSource: (source: CounsellorSource) => void;
};

/**
 * Right rail: when the active turn has retrieved sources, lead with those citation cards;
 * otherwise keep the verified-advocate / advice / judgment shortcuts.
 */
export function SourcePanel({ mode, sources, onOpenSource }: Props) {
  const lawyers = useQuery(publicLawyersQuery());
  const advice = useQuery(adviceListQuery);
  const judgements = useQuery(judgementsQuery);
  const hasSources = sources.length > 0;

  return (
    <aside className="counsellor-drawer hidden h-full w-[17.5rem] shrink-0 flex-col overflow-y-auto border-l border-border/70 bg-gradient-to-b from-card/70 via-card/40 to-background/40 px-4 py-5 lg:flex xl:w-[20rem]">
      <SectionHeading
        eyebrow={mode === "research" || hasSources ? "Sources" : "Quick lookup"}
        title={
          hasSources ? "This answer" : mode === "research" ? "Sources nearby" : "Verified advocates"
        }
      />
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {hasSources
          ? "Retrieved from LegalFinder for this question. Authority labels separate guides, judgments, statutes and official headlines."
          : mode === "research"
            ? "Ask a question to retrieve matching judgments, guides, library items and headlines."
            : "Counsellor can point you here when you need representation."}
      </p>

      {hasSources ? (
        <div className="mt-5 space-y-2.5">
          {sources.map((source, index) => (
            <CitationCard
              key={`${source.kind}-${source.id}`}
              source={source}
              index={index + 1}
              onOpen={onOpenSource}
              compact
            />
          ))}
          <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
            Open a card to verify against the original. Editorial guides are not official law.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {lawyers.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))
          ) : (lawyers.data ?? []).length === 0 ? (
            <EmptyState title="No advocates listed yet" />
          ) : (
            (lawyers.data ?? []).slice(0, 3).map((lawyer) => (
              <Link
                key={lawyer.id}
                to="/lawyers/$lawyerId"
                params={{ lawyerId: lawyer.id }}
                className="block rounded-2xl border border-border/80 bg-card/80 p-3.5 shadow-sm transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-sm font-semibold">{lawyer.full_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lawyer.headline ?? lawyer.firm ?? "Advocate"}
                    </p>
                  </div>
                  {lawyer.verified ? (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-brass" aria-label="Verified" />
                  ) : (
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-brass" />
          <p className="text-sm font-semibold">Latest advice</p>
        </div>
        <div className="mt-3 space-y-2">
          {advice.isLoading
            ? Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))
            : (advice.data ?? [])
                .filter((item): item is typeof item & { slug: string } => Boolean(item.slug))
                .slice(0, 3)
                .map((item) => (
                  <Link
                    key={item.id}
                    to="/advice/$slug"
                    params={{ slug: item.slug }}
                    className="block rounded-lg bg-secondary/50 p-2.5 transition-colors hover:bg-secondary"
                  >
                    <p className="text-xs font-medium leading-snug">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {item.summary}
                    </p>
                  </Link>
                ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-brass" />
          <p className="text-sm font-semibold">Recent judgments</p>
        </div>
        <div className="mt-3 space-y-2">
          {judgements.isLoading
            ? Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))
            : (judgements.data ?? []).slice(0, 3).map((item) => (
                <Link
                  key={item.id}
                  to="/judgements"
                  className="block rounded-lg bg-secondary/50 p-2.5 transition-colors hover:bg-secondary"
                >
                  <p className="text-xs font-medium leading-snug">{item.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{item.court}</p>
                </Link>
              ))}
        </div>
      </div>

      <Link
        to="/updates"
        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-xs font-medium text-emerald-900 transition-colors hover:border-emerald-500/40 dark:text-emerald-200"
      >
        <Newspaper className="h-3.5 w-3.5" />
        Official headlines on Updates
      </Link>
    </aside>
  );
}
