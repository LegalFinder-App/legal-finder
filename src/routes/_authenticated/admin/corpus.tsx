import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Database, Newspaper, Radio } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { loadLegalCorpusHealth, reindexLegalCorpus } from "@/lib/legal-corpus.functions";
import { relativeTime } from "@/components/app/workspace/workspace-frame";

export const Route = createFileRoute("/_authenticated/admin/corpus")({
  head: () => ({ meta: [{ title: "LegalFinder | Legal corpus" }] }),
  component: CorpusHealthPage,
});

function CorpusHealthPage() {
  const queryClient = useQueryClient();
  const health = useQuery({
    queryKey: ["admin", "legal-corpus-health"],
    queryFn: () => loadLegalCorpusHealth(),
    staleTime: 30_000,
  });
  const [indexing, setIndexing] = useState(false);

  const runIndex = async () => {
    setIndexing(true);
    try {
      const result = await reindexLegalCorpus();
      toast.success("Corpus re-index finished", {
        description: `${result.chunksUpserted} chunks upserted · ${result.documents} docs scanned`,
      });
      if (result.errors.length) {
        toast.error(`${result.errors.length} index errors`, {
          description: result.errors[0],
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "legal-corpus-health"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Re-index failed");
    } finally {
      setIndexing(false);
    }
  };

  const data = health.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-brass">Legal intelligence</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Corpus health
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Source registry, Judiciary/UPF feed sync, and Counsellor FTS chunks. Re-index after
            content or feed updates — rate-limited (a few runs per hour). No OpenAI key required.
            ULII stays gated.
          </p>
        </div>
        <Button
          type="button"
          variant="brass"
          disabled={indexing}
          onClick={() => void runIndex()}
          className="w-full self-start sm:w-auto"
        >
          {indexing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Re-index corpus
        </Button>
      </div>

      {health.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading health…
        </div>
      ) : health.isError ? (
        <p className="text-sm text-destructive">
          {health.error instanceof Error ? health.error.message : "Could not load corpus health."}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={<Database className="h-4 w-4" />}
              label="Indexed chunks"
              value={String(data?.chunkTotal ?? 0)}
              detail={Object.entries(data?.chunkCounts ?? {})
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")}
            />
            <StatCard
              icon={<Newspaper className="h-4 w-4" />}
              label="Live feed items"
              value={String(data?.feedTotal ?? 0)}
              detail={Object.entries(data?.feedCounts ?? {})
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")}
            />
            <StatCard
              icon={<Radio className="h-4 w-4" />}
              label="Registry sources"
              value={String(data?.registry.length ?? 0)}
              detail={`${data?.registry.filter((r) => r.api_status === "pending_licence").length ?? 0} pending licence`}
            />
          </div>

          <section className="rounded-2xl border border-border/80 bg-card/60">
            <header className="border-b border-border/70 px-4 py-3 sm:px-5">
              <h2 className="font-display text-base font-semibold">Feed sync</h2>
              <p className="text-xs text-muted-foreground">
                Last collector runs (Judiciary / UPF). ULII stays gated.
              </p>
            </header>
            <ul className="divide-y divide-border/60">
              {(data?.feedSync ?? []).length === 0 ? (
                <li className="px-4 py-6 text-sm text-muted-foreground sm:px-5">
                  No sync state yet — wait for the daily legal-feed cron.
                </li>
              ) : (
                (data?.feedSync ?? []).map((row) => (
                  <li
                    key={row.source}
                    className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <span className="font-medium capitalize">{row.source}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.last_success_at
                        ? `OK ${relativeTime(row.last_success_at)}`
                        : row.last_run_at
                          ? `Ran ${relativeTime(row.last_run_at)}`
                          : "Never"}
                      {row.last_error ? ` · ${row.last_error.slice(0, 80)}` : ""}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/5 via-card/80 to-card/60 shadow-sm">
            <header className="border-b border-brass/15 px-4 py-3 sm:px-5">
              <h2 className="font-display text-base font-semibold">Core statute pack</h2>
              <p className="text-xs text-muted-foreground">
                Constitution and major Acts — stay link-only until you upload a hostable edition.
                Section-aware indexing runs once library legislation text is present.
              </p>
            </header>
            <ul className="divide-y divide-border/50">
              {(data?.registry ?? [])
                .filter((row) => row.slug.startsWith("ug-"))
                .map((row) => (
                  <li
                    key={row.slug}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div>
                      <p className="text-sm font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.slug}</p>
                    </div>
                    <span className="rounded-full border border-border/80 bg-background/70 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground">
                      {row.host_policy} · {row.api_status}
                    </span>
                  </li>
                ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card/60">
            <header className="border-b border-border/70 px-4 py-3 sm:px-5">
              <h2 className="font-display text-base font-semibold">Source registry</h2>
              <p className="text-xs text-muted-foreground">
                Licence and host policy from Phase 0 inventory.
              </p>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-border/70 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium sm:px-5">Source</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Host</th>
                    <th className="px-3 py-2 font-medium">Synced</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.registry ?? []).map((row) => (
                    <tr key={row.slug} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-2.5 sm:px-5">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.slug}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{row.api_status}</td>
                      <td className="px-3 py-2.5 text-xs">{row.host_policy}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {row.last_success_at ? relativeTime(row.last_success_at) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5">
            <h2 className="font-display text-base font-semibold">Takedown & honesty</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>
                Feed items use soft-delete (`removed_at`) — the collector never re-publishes a
                removed story.
              </li>
              <li>
                Unpublish advice / judgments / library rows in Admin → Content, then re-index so
                Counsellor stops citing them.
              </li>
              <li>
                Never claim we scraped ULII or hold an “E2E encrypted law DB.” Marketing copy must
                stay: grounded corpus + official headlines + links to originals.
              </li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-brass">
        {icon}
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
