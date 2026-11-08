import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Scale, ShieldCheck, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { trackSpotlight } from "@/lib/motion";
import { cn } from "@/lib/utils";

const HIGHLIGHTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BadgeCheck,
    title: "Verified advocates only",
    body: "Every advocate is checked against the roll before their profile goes live.",
  },
  {
    icon: Scale,
    title: "Your matter, start to finish",
    body: "Hearing dates, notes and documents in one place, from filing to judgement.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Two-step verification, and access rules enforced inside the database itself.",
  },
];

/**
 * The frame every auth screen shares (sign-in, sign-up, codes, password reset, two-step setup):
 * a form card and, from lg, a dark showcase panel inside one rounded frame. Phones get a single
 * full-width card that scrolls with the keyboard (dvh, safe areas).
 */
export function AuthShell({
  children,
  showcaseTitle = "The justice system, organised around the person who needs it.",
}: {
  children: ReactNode;
  showcaseTitle?: string;
}) {
  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden bg-sky pb-safe pt-safe">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light" />
      <div
        aria-hidden
        className="animate-aurora absolute -left-40 -top-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-gold/20 blur-[110px]"
      />
      <div
        aria-hidden
        className="animate-aurora absolute -bottom-48 -right-32 -z-10 h-[30rem] w-[30rem] rounded-full bg-info/15 blur-[120px] [animation-delay:-9s]"
      />

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-3 py-3 sm:px-6 sm:py-6 lg:justify-center lg:py-10">
        <div className="animate-auth-in grid flex-1 overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-float sm:rounded-[2rem] lg:min-h-[44rem] lg:flex-none lg:grid-cols-[1.05fr_1fr]">
          <section className="flex flex-col px-5 py-6 sm:px-10 sm:py-9 lg:px-12 xl:px-14">
            <div className="flex items-center justify-between gap-3">
              <Link to="/" aria-label="LegalFinder home" className="rounded-full text-foreground">
                <Logo />
              </Link>
              <Link
                to="/"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back to site
              </Link>
            </div>
            <div className="flex flex-1 flex-col justify-center py-8 sm:py-10">
              <div className="mx-auto w-full max-w-[26rem]">{children}</div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Protected by two-step verification and row-level security.
            </p>
          </section>

          <Showcase title={showcaseTitle} />
        </div>
      </div>
    </div>
  );
}

function Showcase({ title }: { title: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Gentle auto-advance; off when the visitor prefers reduced motion or is hovering.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % HIGHLIGHTS.length), 4500);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <aside
      aria-label="Why LegalFinder"
      onPointerMove={trackSpotlight}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className="spotlight relative isolate m-2 hidden overflow-hidden rounded-[1.5rem] surface-ink lg:flex lg:flex-col"
      style={{ "--spot-size": "520px" } as CSSProperties}
    >
      <picture>
        <source
          type="image/avif"
          srcSet="/images/site/justice-800.avif 800w, /images/site/justice-1200.avif 1200w"
          sizes="40vw"
        />
        <img
          src="/images/site/justice-800.webp"
          srcSet="/images/site/justice-800.webp 800w, /images/site/justice-1200.webp 1200w"
          sizes="40vw"
          alt=""
          width={1200}
          height={800}
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[65%_center] opacity-35"
        />
      </picture>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,oklch(0.16_0.035_262/0.55)_0%,oklch(0.16_0.035_262/0.92)_70%)]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-60" />
      <div
        aria-hidden
        className="animate-aurora absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[oklch(0.78_0.115_80/0.25)] blur-[90px]"
      />

      <div className="flex flex-1 flex-col justify-end p-9 xl:p-11">
        <span className="inline-flex w-fit items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-medium text-ink-foreground/85 surface-glass-ink">
          <img
            src="/images/brand/emblem-80.webp"
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px] rounded-full"
          />
          Uganda's justice platform
        </span>
        <h2 className="mt-5 text-h2 font-bold text-ink-foreground">{title}</h2>

        <ul className="mt-8 space-y-2.5">
          {HIGHLIGHTS.map((h, i) => (
            <li key={h.title}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-current={active === i || undefined}
                className={cn(
                  "flex w-full items-start gap-3.5 rounded-2xl p-3.5 text-left transition-[background-color,border-color] duration-300",
                  active === i
                    ? "surface-glass-ink"
                    : "border border-transparent hover:bg-ink-foreground/5",
                )}
              >
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors duration-300",
                    active === i
                      ? "bg-brass text-brass-foreground"
                      : "bg-ink-foreground/10 text-brass",
                  )}
                >
                  <h.icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink-foreground">{h.title}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-foreground/70 transition-opacity duration-300",
                      active === i ? "opacity-100" : "opacity-70",
                    )}
                  >
                    {h.body}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex gap-1.5" aria-hidden>
          {HIGHLIGHTS.map((h, i) => (
            <span
              key={h.title}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                active === i ? "w-8 bg-brass" : "w-3 bg-ink-foreground/25",
              )}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
