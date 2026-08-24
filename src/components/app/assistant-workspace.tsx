import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BrainCircuit, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, SectionHeading } from "@/components/common/bits";
import {
  adviceListQuery,
  judgementsQuery,
  publicLawyersQuery,
  newsListQuery,
  securityTipsQuery,
} from "@/lib/queries";

const SUGGESTIONS = [
  "Find a verified family lawyer in Kampala",
  "What to do after an arrest",
  "Search recent constitutional judgements",
  "Show security guidance for clients",
];

export function AssistantWorkspace() {
  const [prompt, setPrompt] = useState("");

  const lawyerSearch = useMemo(() => {
    const query = prompt.trim();
    return query.length > 2 ? { q: query } : undefined;
  }, [prompt]);

  const lawyers = useQuery(publicLawyersQuery(lawyerSearch));
  const advice = useQuery(adviceListQuery);
  const news = useQuery(newsListQuery);
  const judgements = useQuery(judgementsQuery);
  const tips = useQuery(securityTipsQuery);

  const insight = useMemo(() => {
    const normalized = prompt.toLowerCase();
    if (normalized.includes("arrest") || normalized.includes("police")) {
      return "Focus on preserving your right to silence, requesting the OB number, and contacting an advocate immediately.";
    }
    if (normalized.includes("family") || normalized.includes("custody")) {
      return "Prioritize evidence of contribution, childcare history, and any court orders or agreements already in place.";
    }
    if (normalized.includes("land") || normalized.includes("property")) {
      return "Run title, map, consent, and rates checks before any transfer or deposit is made.";
    }
    return "Use the search box to pull advocates, advice, judgements, and security guidance into one workspace.";
  }, [prompt]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">Legal assistant</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Assistant</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Search across advocates, guidance, judgements and safety tips. The assistant keeps the
        existing legal workspace language but makes it actionable.
      </p>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-plate">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask LegalFinder to find a lawyer, search advice, or explain your next step"
              className="h-12 pl-9"
            />
          </div>
          <Button variant="brass" className="md:w-auto">
            Ask assistant <BrainCircuit className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setPrompt(suggestion)}
              className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-lg bg-secondary/50 p-4">
          <p className="eyebrow text-brass">Suggested direction</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">{insight}</p>
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeading
            eyebrow="Search results"
            title="Verified advocates"
            description="Search by name or use the suggestions above to surface the right specialists."
          />
          <div className="mt-4 space-y-3">
            {(lawyers.data ?? []).length === 0 ? (
              <EmptyState
                title="No advocates matched"
                description="Try a different term or use one of the prompt suggestions."
              />
            ) : (
              (lawyers.data ?? []).slice(0, 5).map((lawyer) => (
                <div
                  key={lawyer.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-plate"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display font-semibold">{lawyer.full_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {lawyer.headline ?? lawyer.firm ?? "Advocate"}
                      </p>
                    </div>
                    <ShieldCheck className="h-4 w-4 text-brass" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {lawyer.practice_areas.slice(0, 3).map((area) => (
                      <Badge key={area} variant="brass">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="Knowledge base" title="Guidance, news and safety" />
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border bg-card p-4 shadow-plate">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brass" />
                <p className="font-semibold">Latest advice</p>
              </div>
              <div className="mt-3 space-y-2">
                {(advice.data ?? []).slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-md bg-secondary/40 p-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-plate">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brass" />
                <p className="font-semibold">Security tips</p>
              </div>
              <div className="mt-3 space-y-2">
                {(tips.data ?? []).slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-md bg-secondary/40 p-3">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-plate">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-brass" />
                <p className="font-semibold">Recent judgements and news</p>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  {(judgements.data ?? []).slice(0, 2).map((item) => (
                    <div key={item.id} className="rounded-md bg-secondary/40 p-3">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.court}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {(news.data ?? []).slice(0, 2).map((item) => (
                    <div key={item.id} className="rounded-md bg-secondary/40 p-3">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
