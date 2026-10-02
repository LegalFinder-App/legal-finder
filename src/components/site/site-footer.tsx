import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";

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

export function SiteFooter() {
  return (
    <footer className="surface-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Logo className="text-ink-foreground" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-foreground/60">
            A public-interest platform connecting people with verified advocates, courts, police
            services and plain-language legal knowledge.
          </p>
          <p className="mt-6 eyebrow text-ink-foreground/40">
            Available on web, desktop and mobile
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="eyebrow text-brass">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-ink-foreground/70 transition-colors hover:text-brass"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-ink-foreground/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} LegalFinder. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/terms-of-service" className="transition-colors hover:text-brass">
              Terms of Service
            </Link>
            <Link to="/privacy-policy" className="transition-colors hover:text-brass">
              Privacy Policy
            </Link>
            <Link to="/delete-account" className="transition-colors hover:text-brass">
              Delete account
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-6 text-xs text-ink-foreground/50 sm:px-6 lg:px-8">
          <p>
            LegalFinder is an independent, privately operated platform. It is not a government
            entity and is not affiliated with, endorsed by, or operated on behalf of the Government
            of Uganda, the Judiciary of Uganda, the Uganda Police Force, or any other government
            body. Court judgements and advocate-roll verification referenced on this platform can be
            independently verified at{" "}
            <a
              href="https://judiciary.go.ug/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-brass"
            >
              judiciary.go.ug
            </a>
            ,{" "}
            <a
              href="https://ulii.org/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-brass"
            >
              ulii.org
            </a>{" "}
            and{" "}
            <a
              href="https://upf.go.ug/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-brass"
            >
              upf.go.ug
            </a>
            .
          </p>
          <p className="mt-2">
            Information on this platform is general guidance and is not a substitute for legal
            advice from a qualified advocate.
          </p>
        </div>
      </div>
    </footer>
  );
}
