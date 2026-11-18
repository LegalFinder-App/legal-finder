import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { appSettingsQuery } from "@/lib/app-settings";
import { cn } from "@/lib/utils";

const HIDDEN_PREFIXES = ["/assistant", "/auth", "/session-tasks"];

/**
 * Persistent Counsellor AI launcher — bottom-right on public and signed-in web chrome.
 * Hidden on the assistant itself and when the platform toggle is off.
 */
export function CounsellorFab() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const settings = useQuery(appSettingsQuery);
  const enabled = settings.data?.ai_assistant_enabled !== false;
  const hidden = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!enabled || hidden) return null;

  return (
    <Link
      to="/assistant"
      aria-label="Open Counsellor AI"
      className={cn(
        "counsellor-fab group fixed z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full",
        "border border-brass/40 bg-brass text-brass-foreground shadow-float",
        "transition-[transform,box-shadow,background-color] hover:scale-[1.04] hover:shadow-glow",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))]",
        "sm:h-[3.75rem] sm:w-[3.75rem]",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-80"
      />
      <Sparkles className="relative h-6 w-6 transition-transform group-hover:rotate-6" />
      <span className="sr-only">Counsellor AI</span>
    </Link>
  );
}
