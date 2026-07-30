import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Gavel,
  Landmark,
  Library,
  MessageSquare,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { SectionHeading } from "@/components/common/bits";
import { LawyerCard } from "@/components/common/lawyer-card";
import { Button } from "@/components/ui/button";
import { lawyersQuery, adviceListQuery, newsListQuery, quotesQuery } from "@/lib/queries";
import heroImage from "@/assets/hero-justice.jpg";
import courthouse from "@/assets/courthouse.jpg";
import consultation from "@/assets/consultation.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LegalFinder — Verified advocates, cases & legal knowledge" },
      {
        name: "description",
        content:
          "Search verified advocates, track your cases, book consultations, read court judgements and get plain-language legal guidance — on any device.",
      },
      { property: "og:title", content: "LegalFinder — Verified advocates & legal knowledge" },
      {
        property: "og:description",
        content:
          "One platform for clients, advocates, police and the judiciary. Find help, file matters, track hearings.",
      },
    ],
  }),
  component: Index,
});

const PILLARS = [
  {
    icon: Users,
    title: "Verified advocate directory",
    body: "Filter by practice area, county, language and fee. Every profile is bar-verified before it goes live.",
    to: "/lawyers",
  },
  {
    icon: ScrollText,
    title: "Case & hearing tracking",
    body: "Follow every matter from filing to judgement with hearing dates, notes and shared documents.",
    to: "/dashboard",
  },
  {
    icon: Gavel,
    title: "Court judgements",
    body: "Search reported decisions by court, judge or case number and read structured summaries.",
    to: "/judgements",
  },
  {
    icon: ShieldAlert,
    title: "Report an incident",
    body: "File a report to the nearest station, anonymously if you need to, and track its status.",
    to: "/report",
  },
  {
    icon: Library,
    title: "E-library & advice",
    body: "Statutes, guides and plain-language explainers written for people, not just lawyers.",
    to: "/library",
  },
  {
    icon: Sparkles,
    title: "AI legal assistant",
    body: "Ask a question, understand your options, and get pointed to the right advocate or office.",
    to: "/assistant",
  },
] as const;

const PORTALS = [
  { role: "Clients", body: "Find help, book consultations, track matters and store documents." },
  { role: "Advocates", body: "Manage your practice, clients, appointments and case pipeline." },
  { role: "Police", body: "Triage incident reports, publish notices and coordinate responses." },
  { role: "Judiciary", body: "Publish judgements, manage cause lists and hearing schedules." },
  { role: "Administrators", body: "Verify advocates, moderate content and oversee the platform." },
] as const;

function Index() {
  const lawyers = useQuery(lawyersQuery());
  const advice = useQuery(adviceListQuery);
  const news = useQuery(newsListQuery);
  const quotes = useQuery(quotesQuery);
  const quote = quotes.data?.[0];

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative isolate overflow-hidden surface-ink">
        <img
          src={heroImage}
          alt="Scales of justice in a courthouse hall"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_0%,transparent,oklch(0.15_0.03_258/0.92))]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <p className="eyebrow text-brass">Justice, within reach</p>
          <h1 className="mt-5 max-w-3xl text-[2.6rem] font-semibold leading-[1.03] text-ink-foreground sm:text-6xl">
            Find the right advocate.
            <br />
            <span className="text-brass-gradient">Follow your case to the end.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-foreground/70">
            LegalFinder brings clients, advocates, police services and the judiciary onto one
            platform — on web, desktop and mobile.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild variant="brass" size="xl">
              <Link to="/lawyers">
                Browse advocates <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outlineInk" size="xl">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create free account
              </Link>
            </Button>
          </div>

          <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-8 border-t border-ink-foreground/15 pt-8 sm:grid-cols-4">
            {[
              { k: "Verified advocates", v: `${lawyers.data?.length ?? 0}+` },
              { k: "Practice areas", v: "24" },
              { k: "Reported judgements", v: "1.2k" },
              { k: "Platforms supported", v: "6" },
            ].map((s) => (
              <div key={s.k}>
                <dt className="eyebrow text-ink-foreground/45">{s.k}</dt>
                <dd className="mt-2 font-display text-3xl font-semibold text-ink-foreground tabular-nums">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          eyebrow="What you can do"
          title="Everything a legal matter needs, in one place"
          description="From the first question to the final judgement — the tools are built for the people who need them, not just the professionals."
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl bg-border md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <Link
              key={p.title}
              to={p.to}
              className="group bg-card p-7 transition-colors hover:bg-accent/40"
            >
              <p.icon className="h-6 w-6 text-brass" />
              <h3 className="mt-5 font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brass opacity-0 transition-opacity group-hover:opacity-100">
                Explore <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured advocates */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Directory"
            title="Advocates accepting new clients"
            action={
              <Button asChild variant="outline">
                <Link to="/lawyers">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(lawyers.data ?? []).slice(0, 6).map((l) => (
              <LawyerCard key={l.id} lawyer={l} />
            ))}
          </div>
        </div>
      </section>

      {/* Portals split */}
      <section className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
        <div className="relative">
          <img
            src={courthouse}
            alt="Courthouse colonnade at dawn"
            loading="lazy"
            className="aspect-4/5 w-full rounded-xl object-cover shadow-raised"
          />
          <div className="absolute -bottom-6 -right-4 hidden max-w-xs rounded-lg border border-border bg-card p-5 shadow-raised lg:block">
            <Landmark className="h-5 w-5 text-brass" />
            <p className="mt-3 text-sm leading-relaxed">
              {quote?.text ?? "Justice delayed is justice denied."}
            </p>
            <p className="mt-2 eyebrow text-muted-foreground">
              {quote?.author ?? "William E. Gladstone"}
            </p>
          </div>
        </div>
        <div>
          <SectionHeading
            eyebrow="Five portals, one platform"
            title="Built for every side of the justice system"
            description="Each role signs into a workspace designed around its actual work — with permissions enforced at the database layer."
          />
          <ul className="mt-10 divide-y divide-border border-y border-border">
            {PORTALS.map((p) => (
              <li key={p.role} className="flex gap-4 py-4">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
                <div>
                  <p className="font-display font-semibold">{p.role}</p>
                  <p className="text-sm text-muted-foreground">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Advice + news */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:px-8 lg:py-24">
          <div>
            <SectionHeading eyebrow="Legal advice" title="Know where you stand" />
            <div className="mt-8 space-y-4">
              {(advice.data ?? []).slice(0, 4).map((a) => (
                <Link
                  key={a.id}
                  to="/advice/$slug"
                  params={{ slug: a.slug ?? a.id }}
                  className="group block rounded-lg border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-plate"
                >
                  <p className="eyebrow text-brass">{a.category}</p>
                  <h3 className="mt-2 font-display text-lg font-semibold group-hover:text-brass">
                    {a.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{a.summary}</p>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Newsroom" title="Latest updates" />
            <div className="mt-8 space-y-5">
              {(news.data ?? []).slice(0, 5).map((n) => (
                <Link
                  key={n.id}
                  to="/news/$slug"
                  params={{ slug: n.slug ?? n.id }}
                  className="group block border-b border-border pb-5"
                >
                  <p className="font-mono text-[0.7rem] text-muted-foreground">
                    {new Date(n.published_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <h3 className="mt-1.5 font-display font-semibold leading-snug group-hover:text-brass">
                    {n.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden surface-ink">
        <img
          src={consultation}
          alt="Advocate meeting a client"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:py-28">
          <MessageSquare className="mx-auto h-7 w-7 text-brass" />
          <h2 className="mt-6 font-display text-4xl font-semibold leading-tight text-ink-foreground">
            Talk to someone who can actually help
          </h2>
          <p className="mt-4 text-ink-foreground/70">
            Create an account in under a minute. Message advocates, book consultations and keep every
            document in one secure vault.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild variant="brass" size="xl">
              <Link to="/auth" search={{ mode: "signup" }}>
                Get started
              </Link>
            </Button>
            <Button asChild variant="outlineInk" size="xl">
              <Link to="/contact">Contact the team</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
