import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  MessageSquare,
  Scale,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReveal } from "@/hooks/use-reveal";
import { delay } from "@/lib/motion";

const STEPS = [
  {
    icon: Search,
    title: "Search verified advocates",
    body: "Narrow by practice area, district and fee, then compare ratings and reviews side by side.",
    preview: SearchPreview,
  },
  {
    icon: CalendarCheck,
    title: "Message or book",
    body: "Start a conversation or book a consultation straight from the advocate's profile.",
    preview: BookPreview,
  },
  {
    icon: Scale,
    title: "Follow your matter",
    body: "Hearing dates, notes and documents stay in one place, from filing to judgement.",
    preview: TrackPreview,
  },
] as const;

/**
 * Homepage "How it works": three step cards joined by a brass rail (horizontal from md, a
 * vertical timeline on phones). Each card carries a small illustrated preview of that step —
 * decorative, so hidden from assistive tech.
 */
export function HowItWorks() {
  const ref = useReveal<HTMLDivElement>();

  return (
    <section className="relative isolate overflow-hidden border-y border-border bg-sky">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light" />
      <div
        aria-hidden
        className="absolute left-1/2 top-0 -z-10 h-72 w-[40rem] max-w-full -translate-x-1/2 rounded-full bg-gold/15 blur-3xl"
      />

      <div ref={ref} className="container-page py-16 sm:py-20 lg:py-24">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="eyebrow text-brass">How it works</p>
          <h2 className="mt-3 text-h2 font-bold">From question to courtroom in three steps</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-[1.0625rem]">
            No jargon and no guesswork — LegalFinder walks you from your first question to the final
            judgement.
          </p>
        </div>

        <ol className="relative mt-12 grid grid-cols-1 gap-5 sm:mt-14 md:grid-cols-3 md:gap-6">
          {/* The rail: runs through the step badges. Vertical on phones, horizontal from md. */}
          <div
            aria-hidden
            className="absolute bottom-10 left-12 top-10 w-px sm:left-[3.25rem] bg-[linear-gradient(180deg,transparent,var(--gold)_12%,var(--gold)_88%,transparent)] opacity-60 md:hidden"
          />
          <div
            aria-hidden
            className="absolute left-[16%] right-[16%] top-[3.25rem] hidden h-px bg-[linear-gradient(90deg,transparent,var(--gold)_15%,var(--gold)_85%,transparent)] opacity-60 md:block"
          />

          {STEPS.map((step, i) => (
            <li key={step.title} className="reveal relative min-w-0" style={delay(120 + i * 120)}>
              <article className="card flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl surface-ink shadow-raised ring-1 ring-white/10">
                    <step.icon className="h-6 w-6 text-brass" aria-hidden />
                    <span className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-gold px-1 text-[0.68rem] font-bold tabular-nums text-ink ring-4 ring-card">
                      {i + 1}
                    </span>
                  </span>
                  <p className="eyebrow text-muted-foreground">
                    Step {String(i + 1).padStart(2, "0")}
                  </p>
                </div>
                <h3 className="mt-5 text-h4 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                <div aria-hidden className="min-h-5 flex-1" />
                <div aria-hidden className="card-inset overflow-hidden p-3.5">
                  <step.preview />
                </div>
              </article>
            </li>
          ))}
        </ol>

        <div
          className="reveal mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={delay(480)}
        >
          <Button asChild size="lg" className="shine w-full sm:w-auto">
            <Link to="/lawyers">
              Start with step one <ArrowRight />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">Free to search · no account needed</p>
        </div>
      </div>
    </section>
  );
}

function SearchPreview() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs shadow-xs">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">Land law</span>
        <span className="text-muted-foreground">· Kampala</span>
        <span className="ml-auto h-3.5 w-px animate-pulse bg-foreground/60" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {["bg-[oklch(0.7_0.08_60)]", "bg-[oklch(0.55_0.06_40)]", "bg-[oklch(0.45_0.05_30)]"].map(
            (c) => (
              <span key={c} className={`h-6 w-6 rounded-full ring-2 ring-card ${c}`} />
            ),
          )}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[0.68rem] font-semibold text-success">
          <BadgeCheck className="h-3 w-3" /> Verified
        </span>
      </div>
    </div>
  );
}

function BookPreview() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-brass">
          <MessageSquare className="h-3 w-3" />
        </span>
        <p className="rounded-2xl rounded-tl-md bg-card px-3 py-1.5 text-[0.72rem] text-muted-foreground shadow-xs">
          Happy to look at your documents.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center text-[0.7rem] font-semibold tabular-nums">
        <span className="rounded-lg border border-border bg-card py-1.5 text-muted-foreground">
          09:00
        </span>
        <span className="rounded-lg bg-primary py-1.5 text-primary-foreground shadow-xs">
          10:30
        </span>
        <span className="rounded-lg border border-border bg-card py-1.5 text-muted-foreground">
          14:00
        </span>
      </div>
    </div>
  );
}

function TrackPreview() {
  const stages = [
    { label: "Filed", state: "done" },
    { label: "Hearing", state: "now" },
    { label: "Judgement", state: "next" },
  ] as const;
  return (
    <div>
      <div className="relative flex items-center justify-between">
        <div className="absolute left-3 right-3 top-3 h-0.5 rounded-full bg-border" />
        <div className="absolute left-3 top-3 h-0.5 w-1/2 rounded-full bg-[image:var(--gradient-brass)]" />
        {stages.map((s) => (
          <div key={s.label} className="relative flex flex-col items-center gap-1.5">
            <span
              className={
                s.state === "done"
                  ? "grid h-6 w-6 place-items-center rounded-full bg-success text-white"
                  : s.state === "now"
                    ? "relative grid h-6 w-6 place-items-center rounded-full bg-gold text-ink"
                    : "grid h-6 w-6 place-items-center rounded-full border-2 border-border bg-card"
              }
            >
              {s.state === "done" && <Check className="h-3.5 w-3.5" />}
              {s.state === "now" && (
                <>
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold/50 motion-reduce:hidden" />
                  <span className="relative h-2 w-2 rounded-full bg-ink" />
                </>
              )}
            </span>
            <span className="text-[0.68rem] font-semibold text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
