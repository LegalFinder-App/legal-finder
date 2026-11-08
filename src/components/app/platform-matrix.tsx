import { Link } from "@tanstack/react-router";
import { Download, Laptop2, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";

const TARGETS = [
  {
    icon: Smartphone,
    title: "iOS and Android",
    body: "Native apps for iPhone and Android phones — the same account, matters and messages. Currently in store testing.",
    tag: "Mobile apps",
  },
  {
    icon: Laptop2,
    title: "Windows, macOS and Linux",
    body: "A desktop app for Windows, built from the same app as the phones. macOS and Linux builds are planned.",
    tag: "Desktop apps",
  },
  {
    icon: Tablet,
    title: "Browser and PWA",
    body: "Works in any modern browser, and can be installed from the address bar like an app.",
    tag: "Web app",
  },
] as const;

export function PlatformMatrix() {
  return (
    <section className="card rounded-[2rem] p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="eyebrow text-brass">Where you can use LegalFinder</p>
          <h2 className="mt-2 text-h3 font-bold">One account, wherever you work from</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            The same account and case history follow you across web, mobile and desktop, built from
            a single shared app core.
          </p>
        </div>
        <Button size="lg" asChild>
          <Link to="/dashboard">
            Open shared app <Download className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {TARGETS.map((target) => (
          <div key={target.title} className="card-inset p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-brass">
              <target.icon className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-4 font-bold tracking-tight">{target.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{target.body}</p>
            <p className="mt-4 eyebrow text-brass">{target.tag}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
