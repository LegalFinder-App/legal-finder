import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, FileSignature, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, LoadingRows, QueryError, StatusPill } from "@/components/common/bits";
import { DocumentVault } from "./shared/document-vault";
import { DocumentGenerator } from "@/components/app/documents/document-generator";
import { caseQuery, caseUpdatesQuery, caseDeadlinesQuery, documentsQuery } from "@/lib/queries";
import { insertRow, updateRow } from "@/lib/mutations";
import { ROLE_HOME, useSession } from "@/lib/session";
import type { CaseDeadlineType, CaseOutcome } from "@/integrations/supabase/app-database";

const DEADLINE_TYPES: { value: CaseDeadlineType; label: string }[] = [
  { value: "filing", label: "Filing" },
  { value: "statute_of_limitations", label: "Statute of limitations" },
  { value: "hearing", label: "Hearing" },
  { value: "other", label: "Other" },
];

const OUTCOMES: { value: CaseOutcome; label: string }[] = [
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "settled", label: "Settled" },
  { value: "dismissed", label: "Dismissed" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "other", label: "Other" },
];

function DeadlinesPanel({ caseId, userId }: { caseId: string; userId: string | undefined }) {
  const queryClient = useQueryClient();
  const deadlines = useQuery(caseDeadlinesQuery(caseId));
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CaseDeadlineType>("filing");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["case-deadlines", caseId] });

  const addDeadline = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !title.trim() || !dueDate) return;
    setBusy(true);
    try {
      await insertRow("case_deadlines", {
        case_id: caseId,
        title: title.trim(),
        deadline_type: type,
        due_date: dueDate,
        created_by: userId,
      });
      setTitle("");
      setDueDate("");
      toast.success("Deadline added");
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add deadline");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: "upcoming" | "completed" | "missed") => {
    try {
      await updateRow("case_deadlines", id, { status });
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update deadline");
    }
  };

  return (
    <div>
      <form
        onSubmit={addDeadline}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
      >
        <div className="min-w-[10rem] flex-1 space-y-1.5">
          <Label htmlFor="deadline-title">Deadline</Label>
          <Input
            id="deadline-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="File response brief"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deadline-type">Type</Label>
          <Select value={type} onValueChange={(value) => setType(value as CaseDeadlineType)}>
            <SelectTrigger id="deadline-type" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEADLINE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deadline-date">Due date</Label>
          <Input
            id="deadline-date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="brass" size="sm" disabled={busy}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>

      <div className="mt-4 space-y-3">
        {deadlines.isLoading ? (
          <LoadingRows rows={2} />
        ) : deadlines.isError ? (
          <QueryError
            message={deadlines.error instanceof Error ? deadlines.error.message : undefined}
            onRetry={() => deadlines.refetch()}
          />
        ) : (deadlines.data ?? []).length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-8 w-8" />}
            title="No deadlines tracked"
            description="Add filing dates, statute-of-limitations, or hearing deadlines to keep this matter on track."
          />
        ) : (
          (deadlines.data ?? []).map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div>
                <p className="font-display font-semibold">{d.title}</p>
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {d.deadline_type.replace(/_/g, " ")} · Due{" "}
                  {new Date(d.due_date).toLocaleDateString()}
                </p>
              </div>
              <Select
                value={d.status}
                onValueChange={(value) =>
                  void setStatus(d.id, value as "upcoming" | "completed" | "missed")
                }
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function UpdatesTimeline({
  caseId,
  userId,
  authorName,
}: {
  caseId: string;
  userId: string | undefined;
  authorName: string;
}) {
  const queryClient = useQueryClient();
  const updates = useQuery(caseUpdatesQuery(caseId));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !note.trim()) return;
    setBusy(true);
    try {
      await insertRow("case_updates", {
        case_id: caseId,
        author_id: userId,
        author_name: authorName,
        note: note.trim(),
      });
      setNote("");
      toast.success("Update posted");
      queryClient.invalidateQueries({ queryKey: ["case-updates", caseId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to post update");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form onSubmit={addNote} className="flex items-start gap-3">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Post a case update…"
          rows={2}
          className="flex-1"
        />
        <Button type="submit" variant="outline" size="sm" disabled={busy}>
          Post
        </Button>
      </form>
      <div className="mt-4 space-y-3">
        {updates.isLoading ? (
          <LoadingRows rows={2} />
        ) : (updates.data ?? []).length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-8 w-8" />}
            title="No updates yet"
            description="Case notes and status changes will appear here."
          />
        ) : (
          (updates.data ?? []).map((u) => (
            <div key={u.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{u.author_name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleString()}
                </p>
              </div>
              <p className="mt-1 text-sm text-foreground/90">{u.note}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CaseDetail({ caseId }: { caseId: string }) {
  const { user, primaryRole } = useSession();
  const queryClient = useQueryClient();
  const caseData = useQuery(caseQuery(caseId));
  const documents = useQuery(documentsQuery(user?.id));
  const caseDocuments = (documents.data ?? []).filter((d) => d.case_id === caseId);
  const backHome = ROLE_HOME[primaryRole];
  const [generatorOpen, setGeneratorOpen] = useState(false);

  const setOutcome = async (outcome: CaseOutcome) => {
    try {
      await updateRow("cases", caseId, { outcome });
      toast.success("Outcome recorded");
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      queryClient.invalidateQueries({ queryKey: ["cases", user?.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to record outcome");
    }
  };

  if (caseData.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (!caseData.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <EmptyState
          title="Case not found"
          description="This case may not exist, or you may not have access to it."
          action={
            <Button asChild variant="brass">
              <Link to={backHome}>Back home</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const c = caseData.data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        to={backHome}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brass"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-brass">{c.reference}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{c.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {c.case_type} · {c.court ?? "Court to be assigned"} · Priority: {c.priority}
          </p>
        </div>
        <StatusPill value={c.status} />
      </div>

      {c.description && (
        <p className="mt-4 max-w-2xl text-sm text-foreground/90">{c.description}</p>
      )}

      {c.status === "closed" && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium">Outcome</p>
          <Select
            value={c.outcome ?? undefined}
            onValueChange={(value) => void setOutcome(value as CaseOutcome)}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              {OUTCOMES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Deadlines</h2>
        <div className="mt-4">
          <DeadlinesPanel caseId={caseId} userId={user?.id} />
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Documents</h2>
          {user?.id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGeneratorOpen(true)}
            >
              <FileSignature className="h-4 w-4" /> Generate document
            </Button>
          )}
        </div>
        <div className="mt-4">
          <DocumentVault
            userId={user?.id}
            caseId={caseId}
            documents={caseDocuments}
            isLoading={documents.isLoading}
            description="Documents attached to this matter."
          />
        </div>
      </section>

      {user?.id && (
        <Dialog open={generatorOpen} onOpenChange={setGeneratorOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate a document</DialogTitle>
            </DialogHeader>
            <DocumentGenerator
              userId={user.id}
              caseId={caseId}
              onGenerated={() => {
                setGeneratorOpen(false);
                queryClient.invalidateQueries({ queryKey: ["documents", user.id] });
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Case updates</h2>
        <div className="mt-4">
          <UpdatesTimeline
            caseId={caseId}
            userId={user?.id}
            authorName={user?.fullName ?? user?.email ?? "Unknown"}
          />
        </div>
      </section>
    </div>
  );
}
