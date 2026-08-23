import { BadgeCheck, Download, Laptop2, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";

const TARGETS = [
  {
    icon: Smartphone,
    title: "iOS and Android",
    body: "Package the app for store distribution with native permissions, push notifications and signed releases.",
  },
  {
    icon: Laptop2,
    title: "Windows, macOS and Linux",
    body: "Ship a desktop shell with auto-update, file access and offline cache support.",
  },
  {
    icon: Tablet,
    title: "Browser and PWA",
    body: "Keep the shared web app installable and offline-ready for the fastest universal deployment path.",
  },
] as const;

export function PlatformMatrix() {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-plate">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="eyebrow text-brass">Deployment matrix</p>
          <h2 className="mt-1 font-display text-xl font-semibold">
            One product, multiple release targets
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            The repository is structured so the shared app core can be released through web, mobile
            and desktop packaging without rewriting product logic.
          </p>
        </div>
        <Button variant="brass" size="sm" asChild>
          <a href="/dashboard">
            Open shared app <Download className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {TARGETS.map((target) => (
          <div key={target.title} className="rounded-lg border border-border bg-secondary/25 p-4">
            <target.icon className="h-5 w-5 text-brass" />
            <p className="mt-3 font-display text-base font-semibold">{target.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{target.body}</p>
            <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brass">
              Production-ready structure <BadgeCheck className="h-3.5 w-3.5" />
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
