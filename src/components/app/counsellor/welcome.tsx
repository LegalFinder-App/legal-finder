import { BookOpen, Gavel, Scale, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { CounsellorMark } from "@/components/brand/counsellor-mark";
import { PROMPT_CARDS } from "./types";

type Props = {
  onSend: (text: string) => void;
  sending: boolean;
  researchMode?: boolean;
};

export function WelcomeScreen({ onSend, sending, researchMode = false }: Props) {
  return (
    <div className="counsellor-welcome mx-auto flex h-full max-w-3xl flex-col justify-center px-1 py-6 sm:px-4">
      <div className="text-center">
        <div className="counsellor-mark mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-brass/30 bg-gradient-to-br from-brass/20 via-brass/5 to-transparent text-brass shadow-inner sm:h-[4.5rem] sm:w-[4.5rem]">
          <CounsellorMark className="h-8 w-8 sm:h-9 sm:w-9" title="Counsellor AI" />
        </div>
        <p className="eyebrow mt-5 text-brass">
          {researchMode ? "Legal Research" : "Counsellor AI"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {researchMode
            ? "Search LegalFinder first. Then ask with the sources open."
            : "Clear guidance. Grounded in Ugandan law."}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {researchMode
            ? "Filter judgements, library texts and guides on this platform, then ask Counsellor AI about what you find — answers stay private to your account."
            : "Ask about process, rights, documents, or finding a verified advocate. Counsellor AI uses LegalFinder’s directory and publications, and keeps your chat private to you."}
        </p>
      </div>

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
      </div>
    </div>
  );
}
