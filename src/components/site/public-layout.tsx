import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { MaintenanceGate } from "./maintenance-gate";
import { delay } from "@/lib/motion";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <MaintenanceGate>{children}</MaintenanceGate>
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * The light, airy band that opens every public sub-page. It sits under the sticky header, so it
 * pulls itself up by the header's height to let the sky gradient run behind the glass.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate -mt-[calc(var(--header-h)+var(--safe-top))] overflow-hidden bg-sky pt-[calc(var(--header-h)+var(--safe-top))]">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light" />
      <div
        aria-hidden
        className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-gold/20 blur-3xl dark:bg-gold/10"
      />
      <div
        aria-hidden
        className="absolute -left-32 top-10 -z-10 h-72 w-72 rounded-full bg-info/10 blur-3xl"
      />
      <div className="container-page py-12 sm:py-16 lg:py-20">
        {eyebrow && (
          <p className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 eyebrow text-brass shadow-xs backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h1
          className="animate-rise mt-4 max-w-3xl text-h1 font-bold text-foreground"
          style={delay(60)}
        >
          {title}
        </h1>
        {description && (
          <p
            className="animate-rise mt-4 max-w-2xl text-lead text-muted-foreground"
            style={delay(120)}
          >
            {description}
          </p>
        )}
        {children && (
          <div className="animate-rise mt-8" style={delay(180)}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
