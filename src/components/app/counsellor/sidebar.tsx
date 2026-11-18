import { useEffect, useRef } from "react";
import {
  HelpCircle,
  Menu,
  MessageSquarePlus,
  Pin,
  Scale,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Conversation, CounsellorMode } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Conversation[];
  activeId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onTogglePin: (id: string) => void;
  mode: CounsellorMode;
  onModeChange: (mode: CounsellorMode) => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
};

export function CounsellorSidebar({
  open,
  onOpenChange,
  conversations,
  activeId,
  search,
  onSearchChange,
  onSelect,
  onNew,
  onTogglePin,
  mode,
  onModeChange,
  onOpenSettings,
  onOpenHelp,
}: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const q = search.trim().toLowerCase();
  const filtered = conversations.filter((c) => !q || c.title.toLowerCase().includes(q));
  const pinned = filtered.filter((c) => c.pinned);
  const recent = filtered.filter((c) => !c.pinned);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    const mobile = window.matchMedia("(max-width: 1023px)");
    const previous = document.body.style.overflow;
    if (mobile.matches) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    const root = drawerRef.current;
    const focusables = root?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables?.[0];
    const previouslyFocused = document.activeElement as HTMLElement | null;
    first?.focus();

    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !focusables?.length) return;
      const list = Array.from(focusables);
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (!firstEl || !lastEl) return;
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };
    root?.addEventListener("keydown", trap);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      root?.removeEventListener("keydown", trap);
      previouslyFocused?.focus?.();
    };
  }, [open, onOpenChange]);

  const panel = (
    <aside className="flex h-full w-[min(18.5rem,85vw)] flex-col border-r border-border/70 bg-card/95 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brass/15 text-brass">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">Counsellor AI</p>
            <p className="text-[11px] text-muted-foreground">Legal intelligence</p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary lg:hidden"
          onClick={() => onOpenChange(false)}
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <Button type="button" variant="brass" className="w-full justify-start gap-2" onClick={onNew}>
          <MessageSquarePlus className="h-4 w-4" />
          New conversation
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search conversations"
            className="h-9 pl-8 text-sm"
            aria-label="Search conversations"
          />
        </div>
        <div
          className="grid grid-cols-2 gap-1.5 rounded-xl border border-border/70 bg-secondary/40 p-1"
          role="group"
          aria-label="Counsellor mode"
        >
          <button
            type="button"
            aria-pressed={mode === "assistant"}
            onClick={() => onModeChange("assistant")}
            className={cn(
              "rounded-lg px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/40",
              mode === "assistant"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Everyday
          </button>
          <button
            type="button"
            aria-pressed={mode === "research"}
            onClick={() => onModeChange("research")}
            className={cn(
              "rounded-lg px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/40",
              mode === "research"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Research
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-2 pb-3">
        {pinned.length > 0 && (
          <ConversationGroup
            label="Pinned"
            items={pinned}
            activeId={activeId}
            onSelect={(id) => {
              onSelect(id);
              onOpenChange(false);
            }}
            onTogglePin={onTogglePin}
          />
        )}
        <ConversationGroup
          label="Recent"
          items={recent}
          activeId={activeId}
          onSelect={(id) => {
            onSelect(id);
            onOpenChange(false);
          }}
          onTogglePin={onTogglePin}
          empty="No conversations yet"
        />
      </div>

      <div className="space-y-1 border-t border-border/70 p-3">
        <button
          type="button"
          onClick={() => {
            onOpenSettings?.();
            onOpenChange(false);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Settings className="h-4 w-4" /> Settings
        </button>
        <button
          type="button"
          onClick={() => {
            onOpenHelp?.();
            onOpenChange(false);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <HelpCircle className="h-4 w-4" /> Help & information
        </button>
        <Link
          to="/advice"
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          onClick={() => onOpenChange(false)}
        >
          <Scale className="h-4 w-4" /> Advice guides
        </Link>
        <p className="px-2.5 pt-1 text-[10px] leading-relaxed text-muted-foreground/80">
          General information only — not a substitute for a licensed advocate.
        </p>
      </div>
    </aside>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="absolute left-3 top-3.5 z-20 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/90 text-foreground shadow-sm backdrop-blur lg:hidden"
        aria-label="Open conversation history"
        aria-expanded={open}
        aria-controls="counsellor-sidebar-drawer"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="hidden h-full shrink-0 lg:block">{panel}</div>

      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Counsellor conversations"
          id="counsellor-sidebar-drawer"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            aria-label="Close sidebar overlay"
            onClick={() => onOpenChange(false)}
          />
          <div ref={drawerRef} className="counsellor-drawer absolute inset-y-0 left-0 shadow-2xl">
            {panel}
          </div>
        </div>
      )}
    </>
  );
}

function ConversationGroup({
  label,
  items,
  activeId,
  onSelect,
  onTogglePin,
  empty,
}: {
  label: string;
  items: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onTogglePin: (id: string) => void;
  empty?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="px-2 py-3 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-xl px-2.5 py-2 pr-8 text-left transition-colors",
                    active
                      ? "bg-brass/12 text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="line-clamp-2 text-xs leading-snug">{item.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePin(item.id)}
                  className={cn(
                    "absolute right-1 top-1 rounded-md p-1 text-muted-foreground transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100",
                    active || item.pinned ? "opacity-100" : "opacity-0",
                  )}
                  aria-label={item.pinned ? "Unpin conversation" : "Pin conversation"}
                >
                  <Pin className={cn("h-3 w-3", item.pinned && "fill-brass text-brass")} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
