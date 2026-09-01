import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Gavel, Landmark, ShieldCheck, Users } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { StatCard, SectionHeading } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import courthouse from "@/assets/courthouse.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About LegalFinder" },
      {
        name: "description",
        content:
          "LegalFinder is a public-interest platform connecting people with verified advocates, courts and police services.",
      },
      { property: "og:title", content: "About LegalFinder" },
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
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TIMELINE.map((step, index) => (
              <div
                key={step.title}
                className="relative rounded-lg border border-border bg-card p-6 shadow-plate"
              >
                <span className="eyebrow text-brass">Step {index + 1}</span>
                <step.icon className="mt-4 h-6 w-6 text-brass" />
                <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold">It runs everywhere your case does</h2>
        <p className="mt-4 text-muted-foreground">
          Web, installable on Windows, macOS and Linux, and available on iOS and Android from the
          same shared codebase.
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
