import { useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { toast } from "@/lib/toast";
import { EmptyState, LoadingRows, QueryError, StatusPill } from "@/components/common/bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { ContentReportRow, ReportStatus } from "@/integrations/supabase/app-database";
import { useSession } from "@/lib/session";

// What people report from the apps (messages, reviews, other people). The database notifies
// every administrator of a new report with a link here (20261004120000_reports_and_blocks.sql);
// the app's twin is apps/mobile/src/features/admin/ReportsPanel.tsx.

type View = "open" | "closed";

const KIND: Record<string, string> = { message: "Message", review: "Review", user: "Person" };
const REASONS: Record<string, string> = {
  harassment: "Harassment or threats",
  offensive: "Offensive or inappropriate",
  spam: "Spam or advertising",
  fraud: "Scam or fraud",
  other: "Something else",
};

const reportsQuery = (view: View) =>
  queryOptions({
    queryKey: ["admin-reports", view],
    queryFn: async () => {
      const base = supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: view === "open" })
        .limit(100);
      const { data, error } = await (view === "open"
        ? base.eq("status", "open")
        : base.neq("status", "open"));
      if (error) throw error;
      const rows = (data ?? []) as ContentReportRow[];
      const ids = [
        ...new Set(rows.flatMap((r) => [r.reporter_id, r.reported_user_id]).filter(Boolean)),
      ] as string[];
      let people: { id: string; full_name: string | null; email: string | null }[] = [];
      if (ids.length) {
        const result = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
        if (result.error) throw result.error;
        people = result.data ?? [];
      }
      const name = (id: string | null) => {
        if (!id) return "Unknown";
        const person = people.find((p) => p.id === id);
        return person?.full_name || person?.email || "A deleted account";
      };
      return rows.map((r) => ({
        ...r,
        reporterName: name(r.reporter_id),
        reportedName: name(r.reported_user_id),
      }));
    },
  });

export function ReportsPanel() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("open");
  const reports = useQuery(reportsQuery(view));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const close = async (report: ContentReportRow, status: ReportStatus, removeReview = false) => {
    if (!user) return;
    setBusyId(report.id);
    try {
      if (removeReview) {
        const { error } = await supabase.from("reviews").delete().eq("id", report.target_id);
        if (error) throw error;
      }
      const note = notes[report.id]?.trim();
      const { error } = await supabase
        .from("content_reports")
        .update({
          status,
          resolution_note: removeReview
            ? ["Review removed.", note].filter(Boolean).join(" ")
            : note || null,
          handled_by: user.id,
          handled_at: new Date().toISOString(),
        })
        .eq("id", report.id);
      if (error) throw error;
      toast.success(status === "dismissed" ? "Report dismissed" : "Report resolved");
      await queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      if (removeReview) await queryClient.invalidateQueries({ queryKey: ["reviews"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the report");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2 className="font-display text-xl font-semibold">Reports</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Messages, reviews and people that users have reported. Review each one, act on it, and mark
        it resolved or dismissed. To remove someone from LegalFinder, delete their account under
        Users &amp; roles.
      </p>

      <div className="mt-4 inline-flex rounded-md border border-border p-0.5">
        {(["open", "closed"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setView(option)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              view === option ? "bg-secondary text-foreground" : "text-muted-foreground"
            }`}
          >
            {option === "open" ? "To review" : "Closed"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {reports.isLoading ? (
          <LoadingRows rows={3} />
        ) : reports.isError ? (
          <QueryError
            message={reports.error instanceof Error ? reports.error.message : undefined}
            onRetry={() => reports.refetch()}
          />
        ) : (reports.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Flag className="h-5 w-5" />}
            title={view === "open" ? "Nothing to review" : "No closed reports yet"}
            description={
              view === "open"
                ? "Reports people send about messages, reviews or other users appear here."
                : undefined
            }
          />
        ) : (
          (reports.data ?? []).map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-5 shadow-plate">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display font-semibold">
                  {KIND[r.target_type] ?? r.target_type}: {REASONS[r.reason] ?? r.reason}
                </p>
                <StatusPill value={r.status === "open" ? "pending" : r.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.target_type === "user" ? "Person reported" : "Written by"}: {r.reportedName}
                <br />
                Reported by: {r.reporterName} · {new Date(r.created_at).toLocaleString()}
              </p>
              {r.excerpt ? (
                <blockquote className="mt-3 border-l-2 border-border pl-3 text-sm whitespace-pre-wrap">
                  {r.excerpt}
                </blockquote>
              ) : null}
              {r.details ? (
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Reporter’s note: </span>
                  {r.details}
                </p>
              ) : null}
              {r.status === "open" ? (
                <div className="mt-4 space-y-3">
                  <Input
                    placeholder="Note (optional)"
                    value={notes[r.id] ?? ""}
                    maxLength={2000}
                    onChange={(event) =>
                      setNotes((prev) => ({ ...prev, [r.id]: event.target.value }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {r.target_type === "review" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" disabled={busyId === r.id}>
                            Remove review
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove this review?</AlertDialogTitle>
                            <AlertDialogDescription>
                              It will no longer show on the advocate’s profile.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => void close(r, "resolved", true)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                    <Button
                      size="sm"
                      variant="brass"
                      disabled={busyId === r.id}
                      onClick={() => void close(r, "resolved")}
                    >
                      Mark resolved
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === r.id}
                      onClick={() => void close(r, "dismissed")}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ) : r.resolution_note ? (
                <p className="mt-3 text-sm text-muted-foreground">Note: {r.resolution_note}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
