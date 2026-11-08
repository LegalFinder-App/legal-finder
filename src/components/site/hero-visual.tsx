import { BadgeCheck, CalendarClock, ShieldCheck, Star, UserRound } from "lucide-react";
import type { Lawyer } from "@/lib/queries";
import { delay } from "@/lib/motion";

/**
 * The homepage hero's right-hand composition: the Lady Justice photograph with floating product
 * cards. The advocate card shows the top-rated live listing; the hearing card is an
 * illustration of the case-tracking feature. Decorative, so hidden from assistive tech — the
 * hero copy carries the message.
 */
export function HeroVisual({ lawyer }: { lawyer?: Lawyer }) {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[34rem] lg:max-w-none">
      <div
        className="animate-rise relative aspect-[5/4] overflow-hidden rounded-[1.75rem] shadow-float ring-1 ring-white/10 sm:aspect-[4/3] lg:aspect-[4/5]"
        style={delay(260)}
      >
        <picture>
          <source
            type="image/avif"
            srcSet="/images/site/justice-480.avif 480w, /images/site/justice-800.avif 800w, /images/site/justice-1200.avif 1200w"
            sizes="(min-width: 1024px) 40vw, (min-width: 640px) 34rem, 92vw"
          />
          <img
            src="/images/site/justice-800.webp"
            srcSet="/images/site/justice-480.webp 480w, /images/site/justice-800.webp 800w, /images/site/justice-1200.webp 1200w"
            sizes="(min-width: 1024px) 40vw, (min-width: 640px) 34rem, 92vw"
            alt=""
            width={1200}
            height={800}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-[68%_center]"
          />
        </picture>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,oklch(0.16_0.035_262/0.7)_100%)]" />

        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.16_0.035_262/0.6)] px-3 py-1.5 text-[0.72rem] font-semibold text-ink-foreground backdrop-blur-md ring-1 ring-white/15 sm:right-4 sm:top-4">
          <ShieldCheck className="h-3.5 w-3.5 text-brass" />
          Checked against the roll
        </span>
      </div>

      {/* Advocate card */}
      <div
        className="animate-rise absolute left-3 top-12 w-[14rem] sm:-left-6 sm:top-16 sm:w-[16rem] lg:-left-10"
        style={delay(420)}
      >
        <div className="animate-float rounded-2xl border border-white/40 bg-card/90 p-3 text-card-foreground shadow-float backdrop-blur-xl dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary">
              {lawyer?.photo_url ? (
                <img
                  src={lawyer.photo_url}
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="m-2.5 h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-[0.82rem] font-bold leading-tight">
                <span className="truncate">{lawyer?.full_name ?? "Verified advocate"}</span>
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-success text-card" />
              </p>
              <p className="truncate text-[0.7rem] text-muted-foreground">
                {lawyer?.headline ?? lawyer?.practice_areas[0] ?? "Advocate"}
              </p>
            </div>
            <p className="inline-flex items-center gap-0.5 text-[0.75rem] font-bold tabular-nums">
              <Star className="h-3 w-3 fill-gold text-gold" />
              {lawyer && lawyer.review_count > 0 ? lawyer.rating.toFixed(1) : "New"}
            </p>
          </div>
          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-secondary/80 px-2.5 py-1.5">
            <span className="text-[0.68rem] font-semibold text-success">● Accepting clients</span>
            <span className="rounded-full bg-primary px-2.5 py-1 text-[0.66rem] font-semibold text-primary-foreground">
              Book
            </span>
          </div>
        </div>
      </div>

      {/* Hearing reminder (illustrative) */}
      <div
        className="animate-rise absolute -bottom-10 right-3 w-[12.5rem] sm:-right-5 sm:bottom-8 sm:w-[15rem] lg:-right-8"
        style={delay(560)}
      >
        <div
          className="animate-float rounded-2xl border border-white/40 bg-card/90 p-3.5 text-card-foreground shadow-float backdrop-blur-xl dark:border-white/10"
          style={delay(1600)}
        >
          <div className="flex items-start gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-brass">
              <CalendarClock className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Next hearing
              </p>
              <p className="mt-0.5 truncate text-[0.82rem] font-bold">Mention · High Court</p>
              <p className="truncate text-[0.7rem] text-muted-foreground">
                Tue · 9:30 AM<span className="hidden sm:inline"> · Courtroom 4</span>
              </p>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-2/3 rounded-full bg-[image:var(--gradient-brass)]" />
          </div>
          <p className="mt-1.5 text-[0.62rem] text-muted-foreground">
            Filing → hearing → judgement
          </p>
        </div>
      </div>
    </div>
  );
}
