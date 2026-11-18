import { BookOpen, Gavel, Scale, Sparkles, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
        <div className="counsellor-mark mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-brass/30 bg-gradient-to-br from-brass/20 via-brass/5 to-transparent shadow-inner">
          <Sparkles className="h-7 w-7 text-brass" aria-hidden />
        </div>
        <p className="eyebrow mt-5 text-brass">
          {researchMode ? "Legal Research" : "Counsellor AI"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {researchMode
            ? "Search first. Then ask with the sources open."
            : "Your questions deserve clearer answers."}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {researchMode
            ? "Use the research panel to filter judgments, library texts and guides, then ask Counsellor AI about what you find."
            : "Explore legal information, understand judgments, discover relevant legislation, and find professional legal assistance with Counsellor AI."}
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
