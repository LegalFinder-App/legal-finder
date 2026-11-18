import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { ArrowRight, Phone, Shield, ShieldOff } from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { EmptyState } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { appSettingsQuery } from "@/lib/app-settings";
import { useSession } from "@/lib/session";
import { delay, trackSpotlight } from "@/lib/motion";

type ReportSearch = { subject?: string };

export const Route = createFileRoute("/report")({
  validateSearch: (search: Record<string, unknown>): ReportSearch => ({
    subject: typeof search.subject === "string" ? search.subject : undefined,
  }),
  head: () => ({
    meta: [
      { title: "LegalFinder | Report an incident" },
      {
        name: "description",
        content:
          "File an incident report to police services, anonymously if you need to, and track its status.",
      },
      { property: "og:title", content: "LegalFinder | Report an incident" },
      { property: "og:description", content: "File a report and track its status." },
    ],
  }),
  component: ReportPage,
});

const CATEGORIES = ["theft", "assault", "fraud", "harassment", "traffic", "other"];

function ReportHero({
  description = "Your report goes to the police workspace with a reference you can follow. Emergencies should always be phoned in first.",
}: {
  description?: string;
}) {
  return (
    <section className="container-page pt-2">
      <div
        onPointerMove={trackSpotlight}
        className="spotlight relative isolate overflow-hidden rounded-[2rem] surface-ink shadow-float dark:ring-1 dark:ring-white/10"
      >
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
        <div
          aria-hidden
          className="animate-aurora absolute -right-16 top-0 -z-10 h-72 w-72 rounded-full bg-[oklch(0.78_0.115_80/0.16)] blur-[90px]"
        />
        <div className="px-5 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <p className="animate-rise inline-flex items-center gap-2 rounded-full px-3 py-1 eyebrow text-brass surface-glass-ink">
            <Shield className="h-3.5 w-3.5" aria-hidden /> Police services
          </p>
          <h1
            className="animate-rise mt-4 max-w-2xl text-h1 font-bold text-ink-foreground"
            style={delay(60)}
          >
            Report an <span className="font-serif italic font-medium text-brass">incident</span>
          </h1>
          <p
            className="animate-rise mt-4 max-w-xl text-lead text-ink-foreground/75"
            style={delay(120)}
          >
            {description}
          </p>
          <div className="animate-rise mt-8 flex flex-wrap gap-2" style={delay(180)}>
            <Button asChild variant="brass" className="rounded-full">
              <Link to="/stations">
                Find a station <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-ink-foreground/20 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
            >
              <a href="tel:999">
                <Phone className="h-4 w-4" /> Emergency call
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportPage() {
  const { user } = useSession();
  const settings = useQuery(appSettingsQuery);
  const { subject } = Route.useSearch();
  const [form, setForm] = useState({
    category: "theft",
    description: subject ? `Sighting report — ${subject}\n\n` : "",
    location: "",
    occurred_at: "",
    anonymous: false,
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.anonymous && !user) {
      toast.error("Sign in to file a named report, or choose anonymous filing.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("incident_reports").insert({
      category: form.category,
      description: form.description,
      location: form.location || null,
      occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : null,
      anonymous: form.anonymous,
      reporter_id: form.anonymous ? null : (user?.id ?? null),
      reporter_name: form.anonymous ? null : (user?.fullName ?? null),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Report filed", { description: "Police services have been notified." });
    setForm({
      category: "theft",
      description: "",
      location: "",
      occurred_at: "",
      anonymous: false,
    });
  };

  if (settings.data && !settings.data.incident_reporting_enabled) {
    return (
      <PublicLayout>
        <ReportHero description="This feature has been paused. Please phone your nearest police station for emergencies." />
        <div className="container-page py-14">
          <EmptyState
            icon={<ShieldOff className="h-8 w-8" />}
            title="Incident reporting is temporarily unavailable"
            description="This feature has been paused. Please phone your nearest police station for emergencies."
          />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <ReportHero />
      <div className="container-page py-10 sm:py-12">
        <form
          onSubmit={submit}
          onPointerMove={trackSpotlight}
          className="card-glow spotlight mx-auto max-w-2xl space-y-5 p-5 sm:p-7"
        >
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: c }))}
                  className={
                    form.category === c
                      ? "rounded-full border border-brass bg-brass/15 px-4 py-1.5 text-sm font-semibold capitalize"
                      : "rounded-full border border-border px-4 py-1.5 text-sm capitalize text-muted-foreground hover:bg-secondary"
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="d">What happened?</Label>
            <Textarea
              id="d"
              rows={6}
              required
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="loc">Location</Label>
              <Input
                id="loc"
                maxLength={200}
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occ">When</Label>
              <Input
                id="occ"
                type="datetime-local"
                value={form.occurred_at}
                onChange={(e) => setForm((f) => ({ ...f, occurred_at: e.target.value }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.anonymous}
              onChange={(e) => setForm((f) => ({ ...f, anonymous: e.target.checked }))}
              className="h-4 w-4"
            />
            File this report anonymously
          </label>
          <Button
            type="submit"
            variant="brass"
            size="lg"
            className="w-full rounded-full"
            disabled={busy}
          >
            Submit report
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}
