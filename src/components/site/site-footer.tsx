import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Mail, MapPin, MessageSquare } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const QUICK_LINKS = [
  { to: "/", label: "Home" },
  { to: "/lawyers", label: "Find an advocate" },
  { to: "/advice", label: "Legal advice" },
  { to: "/judgements", label: "Court judgements" },
  { to: "/library", label: "E-library" },
  { to: "/news", label: "Legal news" },
  { to: "/stations", label: "Police stations" },
  { to: "/report", label: "Report an incident" },
  { to: "/wanted", label: "Public notices" },
  { to: "/safety", label: "Safety & security" },
  { to: "/about", label: "About LegalFinder" },
  { to: "/contact", label: "Contact" },
] as const;

const ACTIONS = [
  { to: "/lawyers", label: "Find an advocate" },
  { to: "/report", label: "Report an incident" },
  { to: "/auth", label: "Sign in" },
] as const;

/** Official sources the disclaimer points people to; also the "find us" card's content. */
const VERIFY = [
  { href: "https://judiciary.go.ug/", label: "Judiciary of Uganda", host: "judiciary.go.ug" },
  { href: "https://ulii.org/", label: "Uganda Legal Information Institute", host: "ulii.org" },
  { href: "https://upf.go.ug/", label: "Uganda Police Force", host: "upf.go.ug" },
] as const;

const SUPPORT_EMAIL = "support@legalfinder.co";

export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden surface-ink">
      {/* Warm brass glow in the top-left corner and a faint engraved grid. */}
      <div
        aria-hidden
        className="absolute -left-40 -top-48 -z-10 h-[30rem] w-[30rem] rounded-full bg-[oklch(0.78_0.115_80/0.13)] blur-[110px]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />

      <div className="container-page">
        {/* Brand row */}
        <div className="flex flex-col gap-6 border-b border-ink-foreground/10 py-10 sm:py-12 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Link
              to="/"
              aria-label="LegalFinder home"
              className="w-fit rounded-full text-ink-foreground"
            >
              <Logo size="lg" />
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-ink-foreground/70">
              Uganda's justice platform — verified advocates, court judgements, police services and
              plain-language legal guidance in one place.
            </p>
          </div>
          <Link
            to="/contact"
            className="group inline-flex min-h-11 w-fit shrink-0 items-center gap-2 text-sm font-semibold text-brass"
          >
            Contact the team
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-10 py-10 sm:py-12 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1.15fr] lg:gap-x-12">
          <nav aria-labelledby="footer-quick-links">
            <h2 id="footer-quick-links" className="eyebrow text-brass">
              Quick links
            </h2>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1 sm:gap-x-8">
              {QUICK_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="inline-flex min-h-9 items-center text-sm text-ink-foreground/70 transition-colors hover:text-ink-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow text-brass">Contact</h2>
            <ul className="mt-5 space-y-3.5 text-sm text-ink-foreground/75">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brass" aria-hidden />
                <span>Kampala, Uganda</span>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex items-start gap-2.5 break-all transition-colors hover:text-ink-foreground"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brass" aria-hidden />
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="flex items-start gap-2.5 transition-colors hover:text-ink-foreground"
                >
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-brass" aria-hidden />
                  Send us a message
                </Link>
              </li>
            </ul>
            <ul className="mt-6 flex flex-wrap gap-2">
              {ACTIONS.map((a) => (
                <li key={a.label}>
                  <Link
                    to={a.to}
                    className="press inline-flex min-h-9 items-center rounded-full border border-ink-foreground/20 px-3.5 text-xs font-medium text-ink-foreground/85 transition-colors hover:border-brass hover:text-ink-foreground"
                  >
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 lg:col-span-1">
            <h2 className="eyebrow text-brass">Verify independently</h2>
            <div className="relative mt-5 overflow-hidden rounded-3xl border border-ink-foreground/12 bg-ink-foreground/[0.04] p-2 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
              <img
                src="/images/brand/emblem-160.webp"
                alt=""
                aria-hidden
                width={160}
                height={160}
                loading="lazy"
                className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full opacity-[0.07]"
              />
              <ul className="relative divide-y divide-ink-foreground/10">
                {VERIFY.map((v) => (
                  <li key={v.href}>
                    <a
                      href={v.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-ink-foreground/[0.06]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink-foreground">
                          {v.label}
                        </span>
                        <span className="block text-xs text-ink-foreground/55">{v.host}</span>
                      </span>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-brass transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden
                      />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-xs text-ink-foreground/55">
              Official sources for judgements, law reports and police services.
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t border-ink-foreground/10 py-8 text-xs leading-relaxed text-ink-foreground/55">
          <p className="max-w-4xl">
            LegalFinder is an independent, privately operated platform. It is not a government
            entity and is not affiliated with, endorsed by, or operated on behalf of the Government
            of Uganda, the Judiciary of Uganda, the Uganda Police Force, or any other government
            body. Court judgements and advocate-roll verification referenced on this platform can be
            independently verified at judiciary.go.ug, ulii.org and upf.go.ug.
          </p>
          <p className="max-w-4xl">
            Information on this platform is general guidance and is not a substitute for legal
            advice from a qualified advocate.
          </p>
        </div>
      </div>

      {/* Solid brand band, as the closing line of the page. */}
      <div className="bg-gold text-ink pb-safe">
        <div className="container-page flex flex-col items-center gap-2 py-4 text-center text-xs font-medium sm:flex-row sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} LegalFinder · Uganda's justice platform</p>
          <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-5">
            <Link
              to="/terms-of-service"
              className="inline-flex min-h-9 items-center hover:underline"
            >
              Terms of Service
            </Link>
            <Link to="/privacy-policy" className="inline-flex min-h-9 items-center hover:underline">
              Privacy Policy
            </Link>
            <Link to="/delete-account" className="inline-flex min-h-9 items-center hover:underline">
              Delete account
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
