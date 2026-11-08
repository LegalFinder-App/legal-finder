import type { CSSProperties } from "react";
import { ArticleCard, ArticleCardSkeleton } from "@/components/common/article-card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Gavel,
  Landmark,
  Library,
  MessageSquare,
  Scale,
  Search,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { HeroVisual } from "@/components/site/hero-visual";
import { HowItWorks } from "@/components/site/how-it-works";
import { SectionHeading } from "@/components/common/bits";
import { LawyerCard, LawyerCardSkeleton } from "@/components/common/lawyer-card";
import { Button } from "@/components/ui/button";
import { MetalButton } from "@/components/ui/metal-button";
import { LiquidButton } from "@/components/ui/liquid-button";
import { PlatformMatrix } from "@/components/app/platform-matrix";
import { adviceListQuery, newsListQuery, publicLawyersQuery, quotesQuery } from "@/lib/queries";
import { useReveal } from "@/hooks/use-reveal";
import { delay, trackSpotlight } from "@/lib/motion";
import { cn } from "@/lib/utils";
import courthouse from "@/assets/courthouse.jpg";
import { prefetchForPage } from "@/lib/prefetch";
import { siteMediaQuery } from "@/lib/site-media";
import { appSettingsQuery } from "@/lib/app-settings";

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
  loader: ({ context: { queryClient } }) =>
    prefetchForPage([
      queryClient.prefetchQuery(publicLawyersQuery()),
      queryClient.prefetchQuery(adviceListQuery),
      queryClient.prefetchQuery(newsListQuery),
      queryClient.prefetchQuery(quotesQuery),
      queryClient.prefetchQuery(siteMediaQuery),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: Index,
});

const PILLARS = [
  {
    icon: Users,
    title: "Verified advocate directory",
    body: "Filter by practice area, district, language and fee. Every profile is checked against the Uganda Law Council roll before it goes live.",
    to: "/lawyers",
    wide: true,
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
    wide: true,
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
    wide: true,
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
  const lawyers = useQuery(publicLawyersQuery());
  const advice = useQuery(adviceListQuery);
  const news = useQuery(newsListQuery);
  const quotes = useQuery(quotesQuery);
  const quote = quotes.data?.[0];

  const list = lawyers.data ?? [];
  const topLawyer = [...list].sort((a, b) => b.rating - a.rating)[0];
  const practiceAreas = Array.from(new Set(list.flatMap((l) => l.practice_areas))).sort();
  const districts = new Set(list.map((l) => l.county).filter(Boolean)).size;
  const stat = (n: number) => (lawyers.isLoading ? "—" : n.toLocaleString());

  const pillarsRef = useReveal<HTMLDivElement>();
  const directoryRef = useReveal<HTMLDivElement>();
  const portalsRef = useReveal<HTMLDivElement>();
  const readingRef = useReveal<HTMLDivElement>();

  return (
    <PublicLayout>
      {/* ---------- Hero ---------- */}
      <section className="container-page pt-2 sm:pt-3">
        <div
          onPointerMove={trackSpotlight}
          className="spotlight relative isolate overflow-hidden rounded-[2rem] surface-ink shadow-float dark:ring-1 dark:ring-white/10 sm:rounded-[2.5rem]"
          style={{ "--spot-size": "720px" } as CSSProperties}
        >
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid" />
          <div
            aria-hidden
            className="animate-aurora absolute -left-32 -top-40 -z-10 h-[30rem] w-[30rem] rounded-full bg-[oklch(0.78_0.115_80/0.22)] blur-[110px]"
          />
          <div
            aria-hidden
            className="animate-aurora absolute -bottom-48 right-0 -z-10 h-[34rem] w-[34rem] rounded-full bg-[oklch(0.55_0.15_258/0.35)] blur-[120px] [animation-delay:-9s]"
          />

          <div className="grid items-center gap-14 px-5 pb-16 pt-10 sm:px-10 sm:pb-20 sm:pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 lg:px-14 lg:py-20 xl:px-16 xl:py-24">
            <div className="min-w-0">
              <p className="animate-rise inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-xs font-medium text-ink-foreground/85 surface-glass-ink">
                <img
                  src="/images/brand/emblem-80.webp"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full"
                />
                Uganda's justice platform
              </p>

              <h1
                className="animate-rise mt-6 text-display font-bold text-ink-foreground"
                style={delay(80)}
              >
                Find the right advocate.{" "}
                <span className="block pb-1 font-serif font-normal italic tracking-[-0.025em] text-brass-gradient">
                  Follow your case to the end.
                </span>
              </h1>

              <p
                className="animate-rise mt-6 max-w-xl text-lead text-ink-foreground/75"
                style={delay(160)}
              >
                LegalFinder brings clients, advocates, police services and the judiciary onto one
                platform — on web, desktop and mobile.
              </p>

              <div
                className="animate-rise mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
                style={delay(240)}
              >
                <MetalButton asChild variant="gold" size="xl" wrapperClassName="w-full sm:w-auto">
                  <Link to="/lawyers">
                    <Search aria-hidden /> Find an advocate <ArrowRight aria-hidden />
                  </Link>
                </MetalButton>
                <LiquidButton asChild size="xl" className="w-full sm:w-auto">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    <UserPlus aria-hidden /> Create free account
                  </Link>
                </LiquidButton>
              </div>

              <div className="animate-rise mt-10 flex items-center gap-4" style={delay(320)}>
                <div className="flex -space-x-2.5" aria-hidden>
                  {list
                    .slice(0, 4)
                    .map((l) =>
                      l.photo_url ? (
                        <img
                          key={l.id}
                          src={l.photo_url}
                          alt=""
                          width={36}
                          height={36}
                          loading="lazy"
                          className="h-9 w-9 rounded-full object-cover ring-2 ring-[oklch(0.2_0.045_262)]"
                        />
                      ) : null,
                    )}
                </div>
                <p className="text-sm leading-snug text-ink-foreground/70">
                  <span className="inline-flex items-center gap-1 font-semibold text-ink-foreground">
                    <ShieldCheck className="h-4 w-4 text-brass" aria-hidden /> Verified profiles
                  </span>
                  <br className="sm:hidden" />
                  <span className="hidden sm:inline"> · </span>
                  checked against the advocates' roll
                </p>
              </div>

              <dl
                className="animate-rise mt-8 grid max-w-md grid-cols-3 border-t border-ink-foreground/12 pt-6"
                style={delay(380)}
              >
                {[
                  { k: "Advocates", v: stat(list.length) },
                  { k: "Practice areas", v: stat(practiceAreas.length) },
                  { k: "Districts", v: stat(districts) },
                ].map((s, i) => (
                  <div
                    key={s.k}
                    className={cn(i > 0 && "border-l border-ink-foreground/12 pl-4 sm:pl-6")}
                  >
                    <dt className="text-xs text-ink-foreground/55">{s.k}</dt>
                    <dd className="mt-1 text-2xl font-bold tracking-tight text-ink-foreground tabular-nums sm:text-[1.75rem]">
                      {s.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <HeroVisual lawyer={topLawyer} />
          </div>
        </div>
      </section>

      {/* ---------- Practice-area marquee ---------- */}
      {practiceAreas.length > 3 && (
        <section aria-label="Practice areas" className="relative overflow-hidden py-8 sm:py-10">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-32" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-32" />
          <ul className="animate-marquee flex w-max gap-3">
            {[...practiceAreas, ...practiceAreas].map((area, i) => (
              <li
                key={`${area}-${i}`}
                aria-hidden={i >= practiceAreas.length || undefined}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-xs"
              >
                <Scale className="h-3.5 w-3.5 text-brass" aria-hidden />
                {area}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Pillars (bento) ---------- */}
      <section className="container-page py-16 sm:py-20 lg:py-28">
        <div ref={pillarsRef}>
          <div className="reveal">
            <SectionHeading
              eyebrow="What you can do"
              title="Everything a legal matter needs, in one place"
              description="From the first question to the final judgement — the tools are built for the people who need them, not just the professionals."
            />
          </div>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p, i) => (
              <div
                key={p.title}
                style={delay(i * 70)}
                className={cn("reveal min-w-0", "wide" in p && p.wide && "lg:col-span-2")}
              >
                <Link
                  to={p.to}
                  onPointerMove={trackSpotlight}
                  className="card card-interactive spotlight group flex h-full flex-col overflow-hidden p-5 sm:min-h-56 sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-brass ring-1 ring-brass/15">
                      <p.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                  <h3 className="mt-6 text-h4 font-bold sm:mt-auto sm:pt-8">{p.title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {p.body}
                  </p>
                  {i === 0 && list.length > 0 && <AvatarRow lawyers={list} />}
                  {i === 5 && <AssistantPreview />}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />

      {/* ---------- Featured advocates ---------- */}
      <section className="container-page py-16 sm:py-20 lg:py-28">
        <div ref={directoryRef}>
          <div className="reveal">
            <SectionHeading
              eyebrow="Directory"
              title="Advocates accepting new clients"
              action={
                <Button asChild variant="outline">
                  <Link to="/lawyers">
                    View all advocates <ArrowRight />
                  </Link>
                </Button>
              }
            />
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {lawyers.isLoading
              ? Array.from({ length: 3 }).map((_, i) => <LawyerCardSkeleton key={i} />)
              : list.slice(0, 6).map((l, i) => (
                  <div key={l.id} className="reveal min-w-0" style={delay(i * 70)}>
                    <LawyerCard lawyer={l} />
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* ---------- Portals ---------- */}
      <section className="container-page pb-16 sm:pb-20 lg:pb-28">
        <div
          ref={portalsRef}
          className="card grid gap-12 rounded-[2rem] p-4 sm:p-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:p-12"
        >
          <div className="reveal relative">
            <img
              src={courthouse}
              alt="Courthouse colonnade at dawn"
              loading="lazy"
              decoding="async"
              width={800}
              height={1000}
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-raised lg:aspect-[4/5]"
            />
            <figure className="absolute inset-x-3 -bottom-6 rounded-2xl border border-border bg-card/95 p-5 shadow-float backdrop-blur sm:inset-x-auto sm:-right-4 sm:max-w-xs">
              <Landmark className="h-5 w-5 text-brass" aria-hidden />
              <blockquote className="mt-3 text-sm leading-relaxed">
                {quote?.text ?? "Justice delayed is justice denied."}
              </blockquote>
              <figcaption className="mt-2 eyebrow text-muted-foreground">
                {quote?.author ?? "William E. Gladstone"}
              </figcaption>
            </figure>
          </div>
          <div className="pt-6 lg:pt-0">
            <div className="reveal">
              <SectionHeading
                eyebrow="Five portals, one platform"
                title="Built for every side of the justice system"
                description="Each role signs into a workspace designed around its actual work — with permissions enforced at the database layer."
              />
            </div>
            <ul className="mt-8 grid gap-2.5">
              {PORTALS.map((p, i) => (
                <li key={p.role} className="reveal card-inset flex gap-4 p-4" style={delay(i * 60)}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success/12 text-success">
                    <BadgeCheck className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                  </span>
                  <div>
                    <p className="font-bold tracking-tight">{p.role}</p>
                    <p className="text-sm text-muted-foreground">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Advice + news ---------- */}
      <section className="border-t border-border bg-secondary/40">
        <div
          ref={readingRef}
          className="container-page grid gap-14 py-16 sm:py-20 lg:grid-cols-[1.3fr_1fr] lg:py-24"
        >
          <div>
            <div className="reveal">
              <SectionHeading eyebrow="Legal advice" title="Know where you stand" />
            </div>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {advice.isLoading &&
                Array.from({ length: 4 }).map((_, i) => <ArticleCardSkeleton key={i} />)}
              {(advice.data ?? []).slice(0, 4).map((a, i) => (
                <div key={a.id} className="reveal min-w-0" style={delay(i * 70)}>
                  <ArticleCard article={a} kind="advice" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="reveal">
              <SectionHeading eyebrow="Newsroom" title="Latest updates" />
            </div>
            <ul className="card mt-8 divide-y divide-border px-5">
              {news.isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} aria-hidden className="flex items-start gap-4 py-5">
                    <div className="h-10 w-14 shrink-0 animate-pulse rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-muted" />
                      <div className="h-3 w-3/5 animate-pulse rounded-full bg-muted/70" />
                    </div>
                  </li>
                ))}
              {(news.data ?? []).slice(0, 5).map((n, i) => (
                <li key={n.id} className="reveal" style={delay(i * 60)}>
                  <Link
                    to="/news/$slug"
                    params={{ slug: n.slug ?? n.id }}
                    className="group flex items-start gap-4 py-5"
                  >
                    <time dateTime={n.published_at} className="mt-0.5 w-14 shrink-0 text-center">
                      <span className="block text-xl font-bold leading-none tabular-nums">
                        {new Date(n.published_at).toLocaleDateString(undefined, { day: "numeric" })}
                      </span>
                      <span className="mt-1 block text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
                        {new Date(n.published_at).toLocaleDateString(undefined, {
                          month: "short",
                          year: "2-digit",
                        })}
                      </span>
                    </time>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug tracking-tight group-hover:text-brass">
                        {n.title}
                      </span>
                      {n.summary && (
                        <span className="mt-1 line-clamp-1 block text-sm text-muted-foreground">
                          {n.summary}
                        </span>
                      )}
                    </span>
                    <ArrowUpRight
                      className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-20 lg:py-24">
        <PlatformMatrix />
      </section>

      {/* ---------- CTA ---------- */}
      <section className="container-page pb-16 sm:pb-20">
        <div className="relative isolate overflow-hidden rounded-[2rem] surface-ink px-6 py-16 text-center shadow-float dark:ring-1 dark:ring-white/10 sm:rounded-[2.5rem] sm:px-10 lg:py-24">
          <picture>
            <source
              type="image/avif"
              srcSet="/images/site/library-640.avif 640w, /images/site/library-1024.avif 1024w, /images/site/library-1600.avif 1600w"
              sizes="(min-width: 1280px) 1216px, 100vw"
            />
            <img
              src="/images/site/library-1024.webp"
              srcSet="/images/site/library-640.webp 640w, /images/site/library-1024.webp 1024w, /images/site/library-1600.webp 1600w"
              sizes="(min-width: 1280px) 1216px, 100vw"
              alt=""
              loading="lazy"
              decoding="async"
              width={1600}
              height={1067}
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30"
            />
          </picture>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(70%_80%_at_50%_100%,oklch(0.78_0.115_80/0.22),transparent_70%)]"
          />
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl surface-glass-ink">
            <MessageSquare className="h-6 w-6 text-brass" aria-hidden />
          </span>
          <h2 className="mx-auto mt-6 max-w-2xl text-h1 font-bold text-ink-foreground">
            Talk to someone who can{" "}
            <span className="font-serif font-normal italic text-brass-gradient">actually help</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lead text-ink-foreground/75">
            Create an account in under a minute. Message advocates, book consultations and keep
            every document in one secure vault.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <MetalButton asChild variant="gold" size="xl" wrapperClassName="w-full sm:w-auto">
              <Link to="/auth" search={{ mode: "signup" }}>
                Get started <ArrowRight aria-hidden />
              </Link>
            </MetalButton>
            <LiquidButton asChild size="xl" className="w-full sm:w-auto">
              <Link to="/contact">Contact the team</Link>
            </LiquidButton>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function AvatarRow({ lawyers }: { lawyers: { id: string; photo_url: string | null }[] }) {
  const shown = lawyers.filter((l) => l.photo_url).slice(0, 6);
  return (
    <div className="mt-6 flex items-center gap-3" aria-hidden>
      <div className="flex -space-x-2">
        {shown.map((l) => (
          <img
            key={l.id}
            src={l.photo_url ?? ""}
            alt=""
            loading="lazy"
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover ring-2 ring-card"
          />
        ))}
      </div>
      <span className="rounded-full bg-success/12 px-2.5 py-1 text-[0.72rem] font-semibold text-success">
        Verified profiles
      </span>
    </div>
  );
}

/** A static preview of the assistant's chat layout — illustrative, hidden from screen readers. */
function AssistantPreview() {
  return (
    <div className="mt-6 grid gap-2 text-[0.8rem]" aria-hidden>
      <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground">
        Can my landlord evict me without notice?
      </p>
      <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2 text-muted-foreground">
        Here's what the law says about notice — and advocates near you who handle tenancy matters.
      </p>
    </div>
  );
}
