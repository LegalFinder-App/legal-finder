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
          <p className="mt-6 eyebrow text-ink-foreground/40">Available on web, desktop and mobile</p>
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
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-ink-foreground/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} LegalFinder. All rights reserved.</p>
          <p>
            Information on this platform is general guidance and is not a substitute for legal
            advice from a qualified advocate.
          </p>
        </div>
      </div>
    </footer>
  );
}