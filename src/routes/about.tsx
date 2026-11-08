import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Gavel, Landmark, ShieldCheck, Users } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { StatCard, SectionHeading } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
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

function About() {
  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Our mission"
        title="Access to justice should not depend on who you know"
        description="LegalFinder exists to shorten the distance between a person with a legal problem and the professional who can solve it."
      />

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Constituencies served" value="5" icon={<Users className="h-4 w-4" />} />
          <StatCard
            label="Advocate verification"
            value="100%"
            icon={<ShieldCheck className="h-4 w-4" />}
          />
          <StatCard
            label="Platforms"
            value="Web · Desktop · Mobile"
            icon={<Landmark className="h-4 w-4" />}
          />
          <StatCard
            label="Access control"
            value="Enforced at the database"
            icon={<BadgeCheck className="h-4 w-4" />}
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <img src={courthouse} alt="Courthouse" className="rounded-xl object-cover shadow-raised" />
        <div className="space-y-5 leading-relaxed text-muted-foreground">
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
            judiciary and administrators — each with a workspace shaped around their real work, and
            permissions enforced at the database layer rather than in the interface.
          </p>
        </div>
      </div>

      <div className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How it works"
            title="From first question to final judgement"
            align="center"
          />
          <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 md:grid-cols-3 md:gap-5">
            {TIMELINE.map((step, index) => (
              <div key={step.title} className="relative card p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-raised">
                    <step.icon className="h-5 w-5" aria-hidden />
                  </span>
                  {/* Decorative step number, drawn with CSS so it isn't read or contrast-checked. */}
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
      </div>

      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold">It runs everywhere your case does</h2>
        <p className="mt-4 text-muted-foreground">
          On the web today, with a Windows desktop app and iPhone and Android apps in store testing
          — all built from the same shared app.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="brass" size="lg">
            <Link to="/lawyers">Browse advocates</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/contact">Contact the team</Link>
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}
