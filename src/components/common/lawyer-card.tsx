import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  MapPin,
  MessageSquareQuote,
  Star,
  UserRound,
  Wallet,
} from "lucide-react";
import type { Lawyer } from "@/lib/queries";
import { matchPracticeAreaMedia, siteMediaQuery } from "@/lib/site-media";
import { tiltHandlers } from "@/hooks/use-tilt";
import { cn } from "@/lib/utils";

/** 110000 → "110k" for the compact stat; the full amount stays in the tooltip/label. */
function shortFee(fee: number) {
  if (fee >= 1_000_000) {
    return `${(fee / 1_000_000).toFixed(fee % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  return fee >= 1_000 ? `${Math.round(fee / 1_000)}k` : String(fee);
}

/**
 * Directory card: cover band, overlapping portrait, full name (never truncated), headline,
 * practice areas, a three-stat strip and one clear action. The whole card is a single link, so
 * there are no nested interactive elements; desktop pointers get the tilt + border glow.
 */
export function LawyerCard({ lawyer, className }: { lawyer: Lawyer; className?: string }) {
  const siteMedia = useQuery(siteMediaQuery);
  const practiceIllustration = siteMedia.data
    ? matchPracticeAreaMedia(siteMedia.data, lawyer.practice_areas)
    : undefined;
  const place = [lawyer.city, lawyer.county].filter(Boolean).join(", ") || "Remote";
  const reviewed = lawyer.review_count > 0;
  const feeLabel = lawyer.consultation_fee
    ? `UGX ${lawyer.consultation_fee.toLocaleString()} consultation fee`
    : "Consultation fee on enquiry";

  return (
    <Link
      to="/lawyers/$lawyerId"
      params={{ lawyerId: lawyer.id }}
      {...tiltHandlers}
      className={cn("group card tilt-card flex h-full min-w-0 flex-col", className)}
    >
      {/* Cover band */}
      <div className="relative h-24 shrink-0 overflow-hidden rounded-t-[calc(var(--radius)+7px)] bg-[linear-gradient(135deg,var(--accent),var(--secondary)_65%)]">
        <div aria-hidden className="absolute inset-0 bg-grid-light opacity-70" />
        <div
          aria-hidden
          className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-gold/25 blur-2xl transition-transform duration-700 group-hover:scale-125"
        />
        {practiceIllustration && (
          <img
            src={practiceIllustration.image_url}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute -bottom-3 right-4 h-16 w-16 opacity-25 mix-blend-multiply dark:opacity-15 dark:mix-blend-screen"
          />
        )}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          {lawyer.accepting_clients ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[0.7rem] font-semibold text-success shadow-xs backdrop-blur">
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 motion-reduce:hidden" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              Accepting clients
            </span>
          ) : (
            <span className="rounded-full bg-card/90 px-2.5 py-1 text-[0.7rem] font-semibold text-muted-foreground shadow-xs backdrop-blur">
              Waitlist
            </span>
          )}
          {reviewed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-[0.72rem] font-bold tabular-nums shadow-xs backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />
              {lawyer.rating.toFixed(1)}
              <span className="sr-only"> out of 5</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-[0.7rem] font-semibold text-info shadow-xs backdrop-blur">
              <Star className="h-3 w-3" aria-hidden /> New
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        {/* Portrait */}
        <div className="relative -mt-10 w-fit">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-secondary shadow-raised ring-4 ring-card transition-transform duration-500 group-hover:scale-[1.03]">
            {lawyer.photo_url ? (
              <img
                src={lawyer.photo_url}
                alt=""
                loading="lazy"
                decoding="async"
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-muted-foreground">
                <UserRound className="h-8 w-8" aria-hidden="true" />
              </span>
            )}
          </div>
          {lawyer.verified && (
            <span
              className="absolute bottom-0.5 right-0.5 grid h-6 w-6 place-items-center rounded-full bg-card shadow-xs"
              title="Verified advocate"
            >
              <BadgeCheck className="h-5 w-5 fill-success text-card" aria-hidden />
            </span>
          )}
        </div>

        <h3 className="mt-3 line-clamp-2 text-[1.0625rem] font-bold leading-snug tracking-tight transition-colors group-hover:text-brass">
          {lawyer.full_name}
          {lawyer.verified && <span className="sr-only"> (verified)</span>}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
          {lawyer.headline ?? lawyer.firm ?? "Advocate"}
        </p>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{place}</span>
        </p>

        {lawyer.practice_areas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {lawyer.practice_areas.slice(0, 3).map((a) => (
              <span
                key={a}
                className="rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-[0.72rem] font-medium text-foreground/80"
              >
                {a}
              </span>
            ))}
            {lawyer.practice_areas.length > 3 && (
              <span className="px-1.5 py-0.5 text-[0.72rem] font-medium text-muted-foreground">
                +{lawyer.practice_areas.length - 3} more
              </span>
            )}
          </div>
        )}

        <div aria-hidden className="min-h-4 flex-1" />

        {/* Stat strip */}
        <dl className="card-inset grid grid-cols-3 divide-x divide-border text-center">
          <div className="px-1 py-2.5">
            <dt className="flex items-center justify-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              <BriefcaseBusiness className="h-3 w-3" aria-hidden /> Exp.
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums">{lawyer.years_experience} yrs</dd>
          </div>
          <div className="px-1 py-2.5">
            <dt className="flex items-center justify-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              <MessageSquareQuote className="h-3 w-3" aria-hidden /> Reviews
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums">{lawyer.review_count}</dd>
          </div>
          <div className="px-1 py-2.5">
            <dt className="flex items-center justify-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              <Wallet className="h-3 w-3" aria-hidden /> Fee
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums" title={feeLabel}>
              <span aria-hidden>
                {lawyer.consultation_fee ? `UGX ${shortFee(lawyer.consultation_fee)}` : "Enquire"}
              </span>
              <span className="sr-only">{feeLabel}</span>
            </dd>
          </div>
        </dl>

        <span className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-xs transition-colors group-hover:bg-primary/90">
          View profile
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  );
}

/** Same footprint as LawyerCard, for loading states (no spinners on content). */
export function LawyerCardSkeleton() {
  return (
    <div className="card flex h-full flex-col" aria-hidden>
      <div className="h-24 animate-pulse rounded-t-[calc(var(--radius)+7px)] bg-muted" />
      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="-mt-10 h-20 w-20 rounded-full bg-muted ring-4 ring-card" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-muted" />
        <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-muted/70" />
        <div className="mt-2 h-3 w-1/3 animate-pulse rounded-full bg-muted/70" />
        <div className="mt-4 flex gap-1.5">
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-5 h-14 animate-pulse rounded-xl bg-muted/70" />
        <div className="mt-4 h-11 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
