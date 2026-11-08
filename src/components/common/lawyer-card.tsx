import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, MapPin, Star, UserRound } from "lucide-react";
import type { Lawyer } from "@/lib/queries";
import { matchPracticeAreaMedia, siteMediaQuery } from "@/lib/site-media";
import { cn } from "@/lib/utils";

export function LawyerCard({ lawyer, className }: { lawyer: Lawyer; className?: string }) {
  const siteMedia = useQuery(siteMediaQuery);
  const practiceIllustration = siteMedia.data
    ? matchPracticeAreaMedia(siteMedia.data, lawyer.practice_areas)
    : undefined;
  const place = [lawyer.city, lawyer.county].filter(Boolean).join(", ") || "Remote";

  return (
    <Link
      to="/lawyers/$lawyerId"
      params={{ lawyerId: lawyer.id }}
      className={cn("group card card-interactive flex h-full min-w-0 flex-col p-5", className)}
    >
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          <div className="h-14 w-14 overflow-hidden rounded-full bg-secondary ring-1 ring-border">
            {lawyer.photo_url ? (
              <img
                src={lawyer.photo_url}
                alt=""
                loading="lazy"
                decoding="async"
                width={56}
                height={56}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-muted-foreground">
                <UserRound className="h-6 w-6" aria-hidden="true" />
              </span>
            )}
          </div>
          {lawyer.verified && (
            <span
              className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-card"
              title="Verified advocate"
            >
              <BadgeCheck className="h-[1.1rem] w-[1.1rem] fill-success text-card" aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[1.02rem] font-bold leading-tight tracking-tight">
            {lawyer.full_name}
            {lawyer.verified && <span className="sr-only"> (verified)</span>}
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {lawyer.headline ?? lawyer.firm ?? "Advocate"}
          </p>
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
            {lawyer.years_experience > 0 && (
              <>
                <span className="tabular-nums">{lawyer.years_experience} yrs</span>
                <span aria-hidden>·</span>
              </>
            )}
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{place}</span>
          </p>
        </div>

        <div className="shrink-0 text-right">
          {lawyer.review_count > 0 ? (
            <>
              <p className="inline-flex items-center gap-1 text-sm font-bold tabular-nums">
                <Star className="h-4 w-4 fill-gold text-gold" aria-hidden />
                {lawyer.rating.toFixed(1)}
                <span className="sr-only"> out of 5</span>
              </p>
              <p className="text-[0.7rem] text-muted-foreground tabular-nums">
                {lawyer.review_count} {lawyer.review_count === 1 ? "review" : "reviews"}
              </p>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[0.7rem] font-semibold text-info">
              <Star className="h-3 w-3" aria-hidden /> New
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 mt-4 flex flex-wrap items-center gap-1.5">
        {practiceIllustration && (
          <img
            src={practiceIllustration.image_url}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="h-6 w-6 shrink-0 rounded-full bg-accent p-1"
          />
        )}
        {lawyer.practice_areas.slice(0, 2).map((a) => (
          <span
            key={a}
            className="rounded-full border border-border px-2.5 py-0.5 text-[0.72rem] font-medium text-foreground/80"
          >
            {a}
          </span>
        ))}
        {lawyer.practice_areas.length > 2 && (
          <span className="text-[0.72rem] font-medium text-muted-foreground">
            +{lawyer.practice_areas.length - 2}
          </span>
        )}
        {lawyer.accepting_clients && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-[0.72rem] font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            Accepting clients
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tabular-nums">
            {lawyer.consultation_fee
              ? `UGX ${lawyer.consultation_fee.toLocaleString()}`
              : "On enquiry"}
          </p>
          <p className="text-[0.7rem] text-muted-foreground">Consultation fee</p>
        </div>
        <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[0.8125rem] font-semibold text-primary-foreground transition-colors group-hover:bg-primary/88">
          View profile
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
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
    <div className="card flex h-full flex-col p-5" aria-hidden>
      <div className="flex items-start gap-3.5">
        <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <div className="mt-5 flex gap-1.5">
        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-28 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
