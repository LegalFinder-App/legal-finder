import { Link } from "@tanstack/react-router";
import { HelpCircle, Moon, Settings2, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "settings" | "help";
};

const THEME_OPTIONS: Array<{ id: ThemePreference; label: string; icon: typeof Sun }> = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export function CounsellorSettingsDialog({ open, onOpenChange, variant = "settings" }: Props) {
  const { theme, setTheme } = useTheme();
  const isHelp = variant === "help";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="space-y-2 border-b border-border/70 px-5 py-4 text-left">
          <div className="flex items-center gap-2 text-brass">
            {isHelp ? <HelpCircle className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
              {isHelp ? "Help" : "Counsellor settings"}
            </p>
          </div>
          <DialogTitle className="font-display text-xl">
            {isHelp ? "Using Counsellor AI" : "Preferences"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {isHelp
              ? "A short guide to Everyday mode, Legal Research, citations and attachments."
              : "Theme follows your LegalFinder preference. Privacy controls live in account Settings."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          {!isHelp && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Appearance
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                      theme === id
                        ? "border-brass/45 bg-brass/10 text-foreground"
                        : "border-border/80 text-muted-foreground hover:border-brass/30 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
            {isHelp ? (
              <>
                <p>
                  <span className="font-semibold text-foreground">Everyday</span> — ask
                  plain-language questions. Counsellor streams an answer with citations when
                  matching LegalFinder sources exist.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Research</span> — split workspace
                  with search, court/category/date filters, and a collapsible source panel.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Attachments</span> — add images or
                  PDFs (up to 3). They are uploaded securely and sent to Anthropic only for that
                  answer.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Authority labels</span> —
                  LegalFinder guides are editorial; judgment and legislation labels mark catalogue
                  entries, not a guarantee of official text.
                </p>
              </>
            ) : (
              <>
                <p>
                  Conversations stay on this device. Clearing site data removes local history. AI
                  consent can be withdrawn any time under account Settings → Privacy.
                </p>
                <p className="text-muted-foreground">
                  Answers are general information — not a substitute for a licensed advocate.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
            <Button asChild variant="brass" size="sm" className="rounded-xl">
              <Link to="/settings" onClick={() => onOpenChange(false)}>
                Account settings
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link to="/advice" onClick={() => onOpenChange(false)}>
                Advice guides
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link to="/privacy-policy" onClick={() => onOpenChange(false)}>
                Privacy
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
