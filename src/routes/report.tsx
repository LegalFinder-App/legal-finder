import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report an incident — LegalFinder" },
      {
        name: "description",
        content:
          "File an incident report to police services, anonymously if you need to, and track its status.",
      },
      { property: "og:title", content: "Report an incident — LegalFinder" },
      { property: "og:description", content: "File a report and track its status." },
    ],
  }),
  component: ReportPage,
});

const CATEGORIES = ["theft", "assault", "fraud", "harassment", "traffic", "other"];

function ReportPage() {
  const { user } = useSession();
  const [form, setForm] = useState({
    category: "theft",
    description: "",
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
      reporter_name: form.anonymous ? null : ((user?.user_metadata?.full_name as string) ?? null),
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

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Police services"
        title="Report an incident"
        description="Your report goes to the police workspace with a reference you can follow. Emergencies should always be phoned in first."
      />
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <form
          onSubmit={submit}
          className="space-y-5 rounded-xl border border-border bg-card p-7 shadow-plate"
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
          <Button type="submit" variant="brass" size="lg" className="w-full" disabled={busy}>
            Submit report
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}
