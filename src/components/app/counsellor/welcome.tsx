import { BookOpen, Gavel, Lock, Newspaper, Scale, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { CounsellorMark } from "@/components/brand/counsellor-mark";
import { COUNSELLOR_CREATOR } from "@/lib/counsellor-meta";
import { PROMPT_CARDS } from "./types";

type Props = {
  onSend: (text: string) => void;
  sending: boolean;
  researchMode?: boolean;
};

const TRUST = [
  { icon: ShieldCheck, label: "Grounded in LegalFinder" },
  { icon: Lock, label: "Private on this device" },
  { icon: Sparkles, label: "Not a licensed advocate" },
] as const;

export function WelcomeScreen({ onSend, sending, researchMode = false }: Props) {
  return (
    <div className="counsellor-welcome relative mx-auto flex h-full max-w-3xl flex-col justify-center px-1 py-6 sm:px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-56 max-w-xl rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.78_0.115_80/0.16),transparent_70%)] blur-2xl"
      />

      <div className="text-center">
        <div className="counsellor-mark mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-brass/30 bg-gradient-to-br from-brass/25 via-brass/8 to-transparent text-brass shadow-[0_12px_40px_-18px_oklch(0.55_0.1_80/0.55)] sm:h-[4.5rem] sm:w-[4.5rem]">
          <CounsellorMark className="h-8 w-8 sm:h-9 sm:w-9" title="Counsellor AI" />
        </div>
        <p className="eyebrow mt-5 text-brass">
          {researchMode ? "Legal Research" : "Counsellor AI"}
        </p>
        <h1 className="mt-2 text-balance font-display text-[1.85rem] font-semibold tracking-tight text-foreground sm:text-4xl">
          {researchMode
            ? "Search the corpus first. Ask with the sources open."
            : "Clear guidance. Grounded in Ugandan law."}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {researchMode
            ? "Filter judgments, library texts, guides and official headlines, then ask Counsellor about what you find — answers stay private to your account."
            : "Ask about process, rights, documents, or finding a verified advocate. Counsellor retrieves LegalFinder publications and directory rows — never invents cites."}
        </p>
        <p className="mx-auto mt-2 max-w-lg text-[11px] leading-relaxed text-muted-foreground/90">
          Created for LegalFinder by{" "}
          <span className="font-medium text-foreground/80">{COUNSELLOR_CREATOR}</span>
        </p>
      </div>

      <ul className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-2">
        {TRUST.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm"
          >
            <Icon className="h-3 w-3 text-brass" aria-hidden />
            {label}
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PROMPT_CARDS.map((card, index) => (
          <button
            key={card.id}
            type="button"
            disabled={sending}
            onClick={() => onSend(card.prompt)}
            style={{ animationDelay: `${80 + index * 40}ms` }}
            className="counsellor-card group rounded-2xl border border-border/80 bg-card/70 p-4 text-left shadow-sm backdrop-blur-sm transition-[transform,border-color,background-color,box-shadow] hover:-translate-y-0.5 hover:border-brass/40 hover:bg-card hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/40 disabled:opacity-60"
          >
            <p className="text-sm font-semibold text-foreground group-hover:text-brass">
              {card.title}
            </p>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {card.prompt}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        <Link
          to="/lawyers"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 transition-colors hover:border-brass/40 hover:text-foreground"
        >
          <Users className="h-3.5 w-3.5 text-brass" /> Advocates
        </Link>
        <Link
          to="/judgements"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 transition-colors hover:border-brass/40 hover:text-foreground"
        >
          <Gavel className="h-3.5 w-3.5 text-brass" /> Judgments
        </Link>
        <Link
          to="/advice"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 transition-colors hover:border-brass/40 hover:text-foreground"
        >
          <BookOpen className="h-3.5 w-3.5 text-brass" /> Advice
        </Link>
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 transition-colors hover:border-brass/40 hover:text-foreground"
        >
          <Scale className="h-3.5 w-3.5 text-brass" /> Library
        </Link>
        <Link
          to="/updates"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 transition-colors hover:border-brass/40 hover:text-foreground"
        >
          <Newspaper className="h-3.5 w-3.5 text-brass" /> Updates
        </Link>
      </div>
    </div>
  );
}
