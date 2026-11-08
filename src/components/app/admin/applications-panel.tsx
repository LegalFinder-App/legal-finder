import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2, Paperclip } from "lucide-react";
import { toast } from "@/lib/toast";
import { EmptyState, LoadingRows, QueryError } from "@/components/common/bits";
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
import { Textarea } from "@/components/ui/textarea";
import { allProfilesQuery } from "@/lib/queries";
import {
  REQUIREMENTS,
  STATUS_LABELS,
  applicationDocumentsQuery,
  applicationsQuery,
  openApplicationDocument,
  reviewApplication,
  type ApplicationStatus,
  type RoleApplicationRow,
} from "@/lib/onboarding";

// Administrators approve advocate, police and judiciary accounts here — the only way those roles
// are granted (20261005090000_professional_onboarding.sql). Every new application notifies them.
// The app's twin is apps/mobile/src/features/admin/ApplicationsPanel.tsx.

type View = "review" | "waiting" | "decided";
const VIEWS: Record<View, { statuses: ApplicationStatus[]; label: string }> = {
  review: { statuses: ["submitted"], label: "To review" },
  waiting: { statuses: ["draft", "changes_requested"], label: "With applicant" },
  decided: { statuses: ["approved", "rejected"], label: "Decided" },
};

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export function ApplicationsPanel() {
  const [view, setView] = useState<View>("review");
  const apps = useQuery(applicationsQuery(VIEWS[view].statuses));
  const profiles = useQuery(allProfilesQuery);
  const email = (userId: string) => profiles.data?.find((p) => p.id === userId)?.email ?? null;

  return (
    <div>
      <h2 className="font-display text-xl font-semibold">Applications</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Advocate, police and judiciary accounts are switched on only by approving an application
        here. Check each document before you approve: approving an advocate also publishes a
        verified listing in the directory.
      </p>

      <div className="mt-4 inline-flex rounded-md border border-border p-0.5">
        {(Object.keys(VIEWS) as View[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setView(option)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              view === option ? "bg-secondary text-foreground" : "text-muted-foreground"
            }`}
          >
            {VIEWS[option].label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {apps.isLoading ? (
          <LoadingRows rows={3} />
        ) : apps.isError ? (
          <QueryError message={message(apps.error, "")} onRetry={() => apps.refetch()} />
        ) : (apps.data ?? []).length === 0 ? (
          <EmptyState
            icon={<BadgeCheck className="h-5 w-5" />}
            title={view === "review" ? "Nothing to review" : "No applications here"}
            description={
              view === "review"
                ? "Advocate, police and judiciary applications appear here once they're sent."
                : undefined
            }
          />
        ) : (
          (apps.data ?? []).map((app) => (
            <ApplicationCard key={app.id} app={app} email={email(app.user_id)} />
          ))
        )}
      </div>
    </div>
  );
}

function ApplicationCard({ app, email }: { app: RoleApplicationRow; email: string | null }) {
  const queryClient = useQueryClient();
  const req = REQUIREMENTS[app.role];
  const docs = useQuery(applicationDocumentsQuery(app.id));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const name = app.details.full_name || "Unnamed";

  const decide = async (decision: "approve" | "changes" | "reject") => {
    if (decision !== "approve" && !note.trim()) {
      toast.error("Write a note first", {
        description: "Say what the applicant needs to know or change.",
      });
      return;
    }
    setBusy(decision);
    try {
      await reviewApplication(app.id, decision, note);
      toast.success(
        decision === "approve"
          ? `${name}'s ${req.noun} account is approved`
          : decision === "changes"
            ? "Changes requested"
            : "Application declined",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-applications"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] }),
        queryClient.invalidateQueries({ queryKey: ["lawyers"] }),
      ]);
    } catch (error) {
      toast.error(message(error, "Couldn't record the decision"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display font-semibold">
          {name} · {req.noun}
        </p>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
          {STATUS_LABELS[app.status]}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {email ?? "No email on file"}
        {app.submitted_at ? ` · sent ${new Date(app.submitted_at).toLocaleString()}` : ""}
      </p>

      <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {req.fields.map((f) =>
          app.details[f.key] ? (
            <div key={f.key}>
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd>{app.details[f.key]}</dd>
            </div>
          ) : null,
        )}
      </dl>

      <div className="mt-3 space-y-2 text-sm">
        {docs.isLoading ? (
          <LoadingRows rows={1} />
        ) : (
          req.documents.map((d) => {
            const files = (docs.data ?? []).filter((x) => x.kind === d.kind);
            return (
              <div key={d.kind}>
                <p className={files.length ? "" : "text-destructive"}>
                  {d.label}
                  {files.length ? "" : " — missing"}
                </p>
                {files.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    className="mt-1 flex items-center gap-1.5 text-brass hover:underline"
                    onClick={() =>
                      void openApplicationDocument(file).catch((e) =>
                        toast.error(message(e, "Couldn't open the document")),
                      )
                    }
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="truncate">{file.name}</span>
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>

      {app.status === "submitted" ? (
        <div className="mt-4 space-y-3">
          <Textarea
            placeholder="Note to the applicant — needed to ask for changes or decline"
            value={note}
            maxLength={2000}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="brass" disabled={busy !== null}>
                  {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Approve
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Approve {name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {app.role === "lawyer"
                      ? "They get the advocate workspace and a verified listing in the directory. Approve only once you've checked their documents against the Roll."
                      : `They get the ${req.noun} workspace. Approve only once you've checked their documents.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void decide("approve")}>
                    Approve
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => void decide("changes")}
            >
              Ask for changes
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy !== null}
              onClick={() => void decide("reject")}
            >
              Decline
            </Button>
          </div>
        </div>
      ) : app.review_note ? (
        <p className="mt-3 text-sm text-muted-foreground">Note: {app.review_note}</p>
      ) : null}
    </div>
  );
}
