import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Gavel, Landmark, ShieldCheck, Users } from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { SectionHeading } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { delay, trackSpotlight } from "@/lib/motion";
import { useReveal } from "@/hooks/use-reveal";
import courthouse from "@/assets/courthouse.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "LegalFinder | About" },
      {
        name: "description",
        content:
          "LegalFinder is a public-interest platform connecting people with verified advocates, courts and police services.",
      },
      { property: "og:title", content: "LegalFinder | About" },
      {
        property: "og:description",
        content: "A public-interest platform for the whole justice system.",
      },
    ],
  }),
  component: About,
});

const TIMELINE = [
  {
    icon: Users,
    title: "You describe the problem",
    body: "Search the directory, read guidance, or ask the assistant — no account needed to browse.",
  },
  {
    icon: BadgeCheck,
    title: "We connect you with someone verified",
    body: "Every advocate is checked against the roll before their profile goes live, with real client reviews.",
  },
  {
    icon: Gavel,
    title: "Your matter is tracked to judgement",
    body: "Cases, hearings, documents and messages stay in one place, with a reference you can follow.",
  },
];

const STATS = [
  { label: "Constituencies served", value: "5", icon: Users },
  { label: "Advocate verification", value: "100%", icon: ShieldCheck },
  { label: "Platforms", value: "Web · Desktop · Mobile", icon: Landmark },
  { label: "Access control", value: "Enforced at the database", icon: BadgeCheck },
] as const;

function About() {
  const storyReveal = useReveal<HTMLElement>();
  const stepsReveal = useReveal<HTMLElement>();

  return (
    <PublicLayout>
      <section className="container-page pt-2">
        <div
          onPointerMove={trackSpotlight}
          className="spotlight relative isolate overflow-hidden rounded-[2rem] surface-ink shadow-float dark:ring-1 dark:ring-white/10"
        >
          <img
            src={courthouse}
            alt=""
            width={1600}
            height={900}
            fetchPriority="high"
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,oklch(0.16_0.035_262/0.96)_0%,oklch(0.16_0.035_262/0.82)_55%,oklch(0.16_0.035_262/0.45)_100%)]"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
          <div
            aria-hidden
            className="animate-aurora absolute -right-20 top-0 -z-10 h-72 w-72 rounded-full bg-[oklch(0.78_0.115_80/0.18)] blur-[90px]"
          />

          <div className="px-5 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <p className="animate-rise inline-flex items-center gap-2 rounded-full px-3 py-1 eyebrow text-brass surface-glass-ink">
              <Landmark className="h-3.5 w-3.5" aria-hidden /> Our mission
            </p>
            <h1
              className="animate-rise mt-4 max-w-3xl text-h1 font-bold text-ink-foreground"
              style={delay(60)}
            >
              Access to justice should not depend on{" "}
              <span className="font-serif italic font-medium text-brass">who you know</span>
            </h1>
            <p
              className="animate-rise mt-4 max-w-2xl text-lead text-ink-foreground/75"
              style={delay(120)}
            >
              LegalFinder exists to shorten the distance between a person with a legal problem and
              the professional who can solve it.
            </p>
            <div className="animate-rise mt-8 flex flex-wrap gap-2" style={delay(180)}>
              <Button asChild variant="brass" className="rounded-full">
                <Link to="/lawyers">
                  Browse advocates <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-ink-foreground/20 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
              >
                <Link to="/contact">Contact the team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-10 sm:py-12">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <li
              key={s.label}
              onPointerMove={trackSpotlight}
              className="card-glow spotlight flex min-w-0 items-center gap-3 p-4"
              style={delay(i * 40)}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-brass">
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold leading-tight tracking-tight">
                  {s.value}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{s.label}</span>
              </span>
            </li>
          ))}
        </ul>

        <section
          ref={storyReveal}
          className="mt-14 grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14"
        >
          <div className="reveal overflow-hidden rounded-[1.75rem] border border-border shadow-plate">
            <img
              src={courthouse}
              alt="Courthouse"
              width={1200}
              height={800}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div className="reveal space-y-5 leading-relaxed text-muted-foreground" style={delay(80)}>
            <p className="eyebrow text-brass">Why LegalFinder</p>
            <h2 className="text-h3 font-bold tracking-tight text-foreground text-balance">
              Built for the moment people meet the justice system
            </h2>
            <p>
              Most people meet the justice system at their worst moment — an eviction, an arrest, a
              death in the family, a contract that collapsed. They rarely know which office to walk
              into, what a matter should cost, or whether the person advising them is even on the
              roll.
            </p>
            <p>
              LegalFinder puts verification, pricing and case history in the open. Advocates are
              checked before publication, reviews come from real clients, and every matter carries a
              reference you can follow from filing to judgement.
            </p>
            <p>
              The platform serves five constituencies — clients, advocates, police services, the
              judiciary and administrators — each with a workspace shaped around their real work,
              and permissions enforced at the database layer rather than in the interface.
            </p>
          </div>
        </section>
      </div>

      <section
        ref={stepsReveal}
        className="border-t border-border bg-secondary/40"
        aria-labelledby="how-it-works"
      >
        <div className="container-page py-14 sm:py-16">
          <div className="reveal" id="how-it-works">
            <SectionHeading
              eyebrow="How it works"
              title="From first question to final judgement"
              align="center"
            />
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 md:grid-cols-3 md:gap-5">
            {TIMELINE.map((step, index) => (
              <div
                key={step.title}
                onPointerMove={trackSpotlight}
                className="card-glow spotlight reveal relative p-5 sm:p-6"
                style={delay(index * 70)}
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl surface-ink shadow-raised">
                    <step.icon className="h-5 w-5 text-brass" aria-hidden />
                  </span>
                  <span
                    aria-hidden
                    data-n={String(index + 1).padStart(2, "0")}
                    className="text-3xl font-bold tabular-nums tracking-tight text-foreground/10 before:content-[attr(data-n)]"
                  />
                </div>
                <h3 className="mt-5 text-base font-bold tracking-tight sm:text-lg">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page py-16 sm:py-20">
        <aside className="relative isolate overflow-hidden rounded-[2rem] surface-ink p-8 text-center shadow-float sm:p-12 dark:ring-1 dark:ring-white/10">
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
          <h2 className="text-h2 font-bold text-ink-foreground text-balance">
            It runs everywhere your case does
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-foreground/75 sm:text-base">
            On the web today, with a Windows desktop app and iPhone and Android apps in store
            testing — all built from the same shared app.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="brass" size="lg" className="rounded-full">
              <Link to="/lawyers">
                Browse advocates <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-ink-foreground/20 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
            >
              <Link to="/contact">Contact the team</Link>
            </Button>
          </div>
        </aside>
      </div>
    </PublicLayout>
  );
}
