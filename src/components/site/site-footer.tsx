import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown, Mail } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const COLUMNS = [
  {
    title: "Find help",
    links: [
      { to: "/lawyers", label: "Advocate directory" },
      { to: "/advice", label: "Legal advice" },
      { to: "/stations", label: "Police stations" },
      { to: "/report", label: "Report an incident" },
    ],
  },
  {
    title: "Knowledge",
    links: [
      { to: "/judgements", label: "Court judgements" },
      { to: "/library", label: "E-library" },
      { to: "/news", label: "Legal news" },
      { to: "/safety", label: "Safety & security" },
    ],
  },
  {
    title: "Platform",
    links: [
      { to: "/about", label: "About LegalFinder" },
      { to: "/wanted", label: "Public notices" },
      { to: "/contact", label: "Contact" },
      { to: "/auth", label: "Sign in" },
    ],
  },
] as const;

const EXTERNAL = [
  { href: "https://judiciary.go.ug/", label: "judiciary.go.ug" },
  { href: "https://ulii.org/", label: "ulii.org" },
  { href: "https://upf.go.ug/", label: "upf.go.ug" },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden surface-ink pb-safe">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-60" />
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -z-10 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-[oklch(0.78_0.115_80/0.12)] blur-3xl"
      />

      <div className="container-page">
        {/* Contact band */}
        <div className="flex flex-col gap-6 border-b border-ink-foreground/10 py-12 md:flex-row md:items-center md:justify-between lg:py-16">
          <div className="max-w-xl">
            <p className="eyebrow text-brass">Need a hand?</p>
            <h2 className="mt-3 text-h3 font-bold text-ink-foreground">
              Questions about LegalFinder? Our team reads every message.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="brass" size="lg">
              <Link to="/contact">
                <Mail /> Contact the team
              </Link>
            </Button>
            <Button asChild variant="outlineInk" size="lg">
              <Link to="/lawyers">Find an advocate</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-10 py-12 lg:grid-cols-[1.5fr_repeat(3,1fr)] lg:py-16">
          <div>
            <Logo size="lg" className="text-ink-foreground" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-foreground/65">
              A public-interest platform connecting people with verified advocates, courts, police
              services and plain-language legal knowledge.
            </p>
            <p className="mt-6 eyebrow text-ink-foreground/45">
              Available on web, desktop and mobile
            </p>
          </div>

          {/* Columns: always open from md up, collapsible on phones. */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <details className="group border-b border-ink-foreground/10 md:hidden">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink-foreground [&::-webkit-details-marker]:hidden">
                  {col.title}
                  <ChevronDown className="h-4 w-4 text-ink-foreground/60 transition-transform group-open:rotate-180" />
                </summary>
                <FooterLinks links={col.links} />
              </details>
              <div className="hidden md:block">
                <h3 className="eyebrow text-brass">{col.title}</h3>
                <FooterLinks links={col.links} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-ink-foreground/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-ink-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} LegalFinder. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/terms-of-service" className="py-1 transition-colors hover:text-brass">
              Terms of Service
            </Link>
            <Link to="/privacy-policy" className="py-1 transition-colors hover:text-brass">
              Privacy Policy
            </Link>
            <Link to="/delete-account" className="py-1 transition-colors hover:text-brass">
              Delete account
            </Link>
          </nav>
        </div>
        <div className="container-page pb-8 text-xs leading-relaxed text-ink-foreground/55">
          <p className="max-w-4xl">
            LegalFinder is an independent, privately operated platform. It is not a government
            entity and is not affiliated with, endorsed by, or operated on behalf of the Government
            of Uganda, the Judiciary of Uganda, the Uganda Police Force, or any other government
            body. Court judgements and advocate-roll verification referenced on this platform can be
            independently verified at{" "}
            {EXTERNAL.map((e, i) => (
              <span key={e.href}>
                <a
                  href={e.href}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-ink-foreground/30 underline-offset-2 hover:text-brass"
                >
                  {e.label}
                </a>
                {i === 0 ? ", " : i === 1 ? " and " : "."}
              </span>
            ))}
          </p>
          <p className="mt-2 max-w-4xl">
            Information on this platform is general guidance and is not a substitute for legal
            advice from a qualified advocate.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({ links }: { links: (typeof COLUMNS)[number]["links"] }) {
  return (
    <ul className="space-y-1 pb-4 md:mt-4 md:pb-0">
      {links.map((l) => (
        <li key={l.to}>
          <Link
            to={l.to}
            className="group inline-flex min-h-10 items-center gap-1 text-sm text-ink-foreground/70 transition-colors hover:text-brass md:min-h-8"
          >
            {l.label}
            <ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
