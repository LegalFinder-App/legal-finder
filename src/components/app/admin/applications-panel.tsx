import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Gavel,
  Hourglass,
  Image as ImageIcon,
  Landmark,
  Loader2,
  Mail,
  Phone,
  Search,
  Shield,
  ShieldCheck,
  UserRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { EmptyState, QueryError } from "@/components/common/bits";
import { ListingToolbar, StatStrip } from "@/components/common/listing-toolbar";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { allProfilesQuery, lawyersQuery } from "@/lib/queries";
import {
  REQUIREMENTS,
  STATUS_LABELS,
  allApplicationsQuery,
  applicationDocumentsQuery,
  openApplicationDocument,
  recordApplicationChecks,
  reviewApplication,
  signedDocumentUrl,
  type ApplicationDocument,
  type ApplicationRole,
  type ApplicationStatus,
  type RoleApplicationRow,
} from "@/lib/onboarding";
import {
  CHIEF_REGISTRAR,
  REVIEW_CHECKLISTS,
  checklistComplete,
  runAutomaticChecks,
  worstStatus,
  type AutoCheck,
  type CheckStatus,
} from "@/lib/verification";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

// The verification pipeline. Advocate, police and judiciary accounts are switched on only by
// approving an application here (20261005090000 + 20261109090000 migrations); the database
// refuses expired certificates, reused Roll numbers and self-approval on its own. The app's twin
// is apps/mobile/src/features/admin/ApplicationsPanel.tsx (no checklist there yet).

type View = "review" | "waiting" | "decided";
const VIEWS: Record<View, { statuses: ApplicationStatus[]; label: string }> = {
  review: { statuses: ["submitted"], label: "To review" },
  waiting: { statuses: ["draft", "changes_requested"], label: "With applicant" },
  decided: { statuses: ["approved", "rejected"], label: "Decided" },
};
const ROLE_META: Record<ApplicationRole, { label: string; icon: LucideIcon; tone: string }> = {
  lawyer: { label: "Advocate", icon: Gavel, tone: "bg-accent text-accent-foreground" },
  police: { label: "Police", icon: Shield, tone: "bg-info/10 text-info" },
  judiciary: { label: "Judiciary", icon: Landmark, tone: "bg-success/10 text-success" },
};
const STATUS_TONE: Record<ApplicationStatus, string> = {
  draft: "bg-secondary text-muted-foreground",
  submitted: "bg-info/10 text-info",
  changes_requested: "bg-warning/15 text-warning-foreground dark:text-warning",
  approved: "bg-success/12 text-success",
  rejected: "bg-destructive/10 text-destructive",
};
const NOTE_TEMPLATES = [
  "The practising certificate has expired. Please upload this year's certificate.",
  "A document is unreadable. Please upload a clearer scan or photo.",
  "The name on your ID doesn't match the name you entered. Please correct it.",
  "We couldn't confirm your Roll number. Please check it and upload your certificate of enrolment.",
];

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const waitingFor = (iso: string | null) => {
  if (!iso) return null;
  const hours = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 3_600_000));
  if (hours < 1) return "just now";
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} days`;
};

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return wide;
}

export function ApplicationsPanel() {
  const apps = useQuery(allApplicationsQuery);
  const profiles = useQuery(allProfilesQuery);
  const listings = useQuery(lawyersQuery());
  const [view, setView] = useState<View>("review");
  const [role, setRole] = useState<"all" | ApplicationRole>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const wide = useWide();

  const all = useMemo(() => apps.data ?? [], [apps.data]);
  const emailOf = useMemo(() => {
    const map = new Map((profiles.data ?? []).map((p) => [p.id, p.email ?? null]));
    return (userId: string | null) => (userId ? (map.get(userId) ?? null) : null);
  }, [profiles.data]);

  const checksFor = useMemo(() => {
    const today = new Date();
    const lawyers = (listings.data ?? []).map((l) => ({
      user_id: l.user_id,
      bar_number: l.bar_number,
      verified: l.verified,
    }));
    // Documents load per application in the detail pane; the queue uses details-only checks.
    return (app: RoleApplicationRow, documents?: ApplicationDocument[]) =>
      runAutomaticChecks({
        app,
        documents: documents ?? [],
        applications: all,
        listings: lawyers,
        email: emailOf(app.user_id),
        today,
      }).filter((c) => documents || c.key !== "documents");
  }, [all, listings.data, emailOf]);

  const term = q.trim().toLowerCase();
  const items = all.filter((a) => {
    if (!VIEWS[view].statuses.includes(a.status)) return false;
    if (role !== "all" && a.role !== role) return false;
    if (!term) return true;
    const text = [
      a.details.full_name,
      a.details.roll_number,
      a.details.force_number,
      a.details.staff_number,
      emailOf(a.user_id),
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(term);
  });
  // Oldest first while waiting; newest decisions first once decided.
  if (view === "decided") items.reverse();

  const count = (v: View) => all.filter((a) => VIEWS[v].statuses.includes(a.status)).length;
  const oldest = all
    .filter((a) => a.status === "submitted")
    .map((a) => a.submitted_at)
    .filter((d): d is string => Boolean(d))
    .sort()[0];
  const selected = all.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    // Keep a selection on wide screens so the detail pane is never empty.
    if (wide && !selected && items[0]) setSelectedId(items[0].id);
  }, [wide, selected, items]);

  const detail = selected ? (
    <ApplicationDetail
      key={selected.id}
      app={selected}
      email={emailOf(selected.user_id)}
      reviewerEmail={emailOf(selected.reviewed_by)}
      checksFor={checksFor}
      onDecided={() => setSelectedId(null)}
    />
  ) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-brass">Verification pipeline</p>
        <h2 className="mt-1 text-h3 font-bold tracking-tight">Applications</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Advocate, police and judiciary accounts are switched on only by approving an application
          here. Automatic checks run on every application; tick the checklist as you verify the
          documents, then decide. Approving an advocate publishes a verified directory listing.
        </p>
      </div>

      <StatStrip
        loading={apps.isLoading}
        items={[
          { icon: Hourglass, label: "To review", value: count("review") },
          { icon: UserRound, label: "With applicant", value: count("waiting") },
          {
            icon: BadgeCheck,
            label: "Approved",
            value: all.filter((a) => a.status === "approved").length,
          },
          {
            icon: Clock,
            label: "Oldest waiting",
            value: oldest ? waitingFor(oldest) : "—",
          },
        ]}
      />

      <div className="flex flex-col gap-3">
        <ListingToolbar
          label="Applications by stage"
          tabs={(Object.keys(VIEWS) as View[]).map((v) => ({
            id: v,
            label: VIEWS[v].label,
            count: count(v),
          }))}
          tab={view}
          onTab={(v) => {
            setView(v as View);
            setSelectedId(null);
          }}
          resultLabel={apps.isLoading ? undefined : `${items.length} shown`}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search applications</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, Roll, force or staff number"
              className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-4 text-base shadow-xs focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 sm:text-sm"
            />
          </label>
          <div
            className="flex gap-1 overflow-x-auto [scrollbar-width:none]"
            role="group"
            aria-label="Role"
          >
            {(["all", "lawyer", "police", "judiciary"] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={role === r}
                onClick={() => setRole(r)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                  role === r
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {r === "all" ? "All roles" : ROLE_META[r].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {apps.isLoading ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-20 animate-pulse" />
            ))}
          </div>
          <div className="card hidden h-96 animate-pulse lg:block" />
        </div>
      ) : apps.isError ? (
        <QueryError message={message(apps.error, "")} onRetry={() => apps.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BadgeCheck />}
          title={view === "review" ? "Nothing waiting for review" : "No applications here"}
          description={
            view === "review"
              ? "New advocate, police and judiciary applications appear here once they're sent."
              : undefined
          }
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <ul className="space-y-2 lg:sticky lg:top-[calc(var(--header-h)+4.5rem)] lg:max-h-[calc(100dvh-var(--header-h)-6rem)] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:thin]">
            {items.map((a) => (
              <li key={a.id}>
                <QueueItem
                  app={a}
                  email={emailOf(a.user_id)}
                  verdict={worstStatus(checksFor(a))}
                  active={a.id === selectedId}
                  onSelect={() => setSelectedId(a.id)}
                />
              </li>
            ))}
          </ul>
          {wide ? (
            <div className="min-w-0">{detail}</div>
          ) : (
            <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
              <SheetContent
                side="bottom"
                className="max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] p-0 pb-[env(safe-area-inset-bottom)]"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Application</SheetTitle>
                </SheetHeader>
                <div aria-hidden className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border" />
                {detail}
              </SheetContent>
            </Sheet>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- queue ---------------- */

function VerdictDot({ status }: { status: CheckStatus }) {
  const meta = {
    pass: { icon: CheckCircle2, cls: "text-success", label: "Automatic checks pass" },
    warn: { icon: AlertTriangle, cls: "text-warning", label: "Automatic checks: warnings" },
    fail: { icon: XCircle, cls: "text-destructive", label: "Automatic checks: problems" },
  }[status];
  return <meta.icon className={cn("h-4 w-4 shrink-0", meta.cls)} aria-label={meta.label} />;
}

function QueueItem({
  app,
  email,
  verdict,
  active,
  onSelect,
}: {
  app: RoleApplicationRow;
  email: string | null;
  verdict: CheckStatus;
  active: boolean;
  onSelect: () => void;
}) {
  const role = ROLE_META[app.role];
  const name = app.details.full_name?.trim() || "Unnamed applicant";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active || undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-[border-color,box-shadow,background-color]",
        active
          ? "border-primary/40 bg-card shadow-[var(--shadow-card-hover)] ring-1 ring-primary/20"
          : "border-border bg-card hover:border-foreground/20",
      )}
    >
      <span
        className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", role.tone)}
        aria-hidden
      >
        <role.icon className="h-[1.1rem] w-[1.1rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-bold tracking-tight">{name}</span>
          <VerdictDot status={verdict} />
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {role.label} · {email ?? "no email"}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.68rem] font-semibold",
              STATUS_TONE[app.status],
            )}
          >
            {STATUS_LABELS[app.status]}
          </span>
          {app.status === "submitted" && app.submitted_at && (
            <span className="inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden /> waiting {waitingFor(app.submitted_at)}
            </span>
          )}
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 lg:hidden"
        aria-hidden
      />
    </button>
  );
}

/* ---------------- detail ---------------- */

function ApplicationDetail({
  app,
  email,
  reviewerEmail,
  checksFor,
  onDecided,
}: {
  app: RoleApplicationRow;
  email: string | null;
  reviewerEmail: string | null;
  checksFor: (app: RoleApplicationRow, documents?: ApplicationDocument[]) => AutoCheck[];
  onDecided: () => void;
}) {
  const queryClient = useQueryClient();
  const docs = useQuery(applicationDocumentsQuery(app.id));
  const req = REQUIREMENTS[app.role];
  const role = ROLE_META[app.role];
  const name = app.details.full_name?.trim() || "Unnamed applicant";
  const reviewing = app.status === "submitted";

  const autoChecks = docs.data ? checksFor(app, docs.data) : checksFor(app);
  const failing = autoChecks.filter((c) => c.status === "fail");

  const saved = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(app.review_checks ?? {})) {
      if (typeof v === "boolean") out[k] = v;
    }
    return out;
  }, [app.review_checks]);
  const [checks, setChecks] = useState<Record<string, boolean>>(saved);
  const [savingChecks, setSavingChecks] = useState(false);
  const dirty = JSON.stringify(checks) !== JSON.stringify(saved);
  const complete = checklistComplete(app.role, checks);

  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-applications"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] }),
      queryClient.invalidateQueries({ queryKey: ["lawyers"] }),
    ]);

  const saveChecks = async () => {
    setSavingChecks(true);
    try {
      await recordApplicationChecks(app.id, checks);
      await queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
      toast.success("Checklist saved");
    } catch (error) {
      toast.error(message(error, "Couldn't save the checklist"));
    } finally {
      setSavingChecks(false);
    }
  };

  const decide = async (decision: "approve" | "changes" | "reject") => {
    if (decision !== "approve" && !note.trim()) {
      toast.error("Write a note first", {
        description: "Say what the applicant needs to know or change.",
      });
      return;
    }
    setBusy(decision);
    try {
      // The checklist is the record of what was verified, so it's saved with every decision.
      if (dirty) await recordApplicationChecks(app.id, checks);
      await reviewApplication(app.id, decision, note);
      toast.success(
        decision === "approve"
          ? `${name}'s ${req.noun} account is approved`
          : decision === "changes"
            ? "Changes requested"
            : "Application declined",
      );
      await refresh();
      onDecided();
    } catch (error) {
      toast.error(message(error, "Couldn't record the decision"));
    } finally {
      setBusy(null);
    }
  };

  const approveBlocked = !complete
    ? "Tick every required check first."
    : failing.length
      ? `Resolve first: ${failing.map((c) => c.label.toLowerCase()).join(", ")}.`
      : null;

  return (
    <article className="card overflow-hidden" aria-label={`Application from ${name}`}>
      {/* Header */}
      <header className="relative isolate overflow-hidden surface-ink p-5 sm:p-6">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-50" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-lg font-bold text-ink-foreground">
              {name
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase()}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-ink-foreground">{name}</h3>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-foreground/70">
                <span className="inline-flex items-center gap-1">
                  <role.icon className="h-3.5 w-3.5 text-brass" aria-hidden /> {role.label}
                </span>
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-1 hover:text-ink-foreground"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden /> {email}
                  </a>
                )}
                {app.details.phone && (
                  <a
                    href={`tel:${app.details.phone.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-1 hover:text-ink-foreground"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden /> {app.details.phone}
                  </a>
                )}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              STATUS_TONE[app.status],
            )}
          >
            {STATUS_LABELS[app.status]}
          </span>
        </div>
        <Timeline app={app} reviewerEmail={reviewerEmail} />
      </header>

      <div className="space-y-7 p-5 sm:p-6">
        {/* Automatic checks */}
        <Block title="Automatic checks" icon={ShieldCheck}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {autoChecks.map((c) => (
              <li
                key={c.key}
                className={cn(
                  "flex gap-2.5 rounded-xl border p-3",
                  c.status === "fail"
                    ? "border-destructive/30 bg-destructive/5"
                    : c.status === "warn"
                      ? "border-warning/40 bg-warning/5"
                      : "border-border bg-secondary/40",
                )}
              >
                <VerdictDot status={c.status} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{c.label}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {c.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Block>

        {/* Details */}
        <Block title="Details given" icon={UserRound}>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {req.fields.map((f) => (
              <div key={f.key} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd
                  className={cn(
                    "break-words text-sm font-medium",
                    !app.details[f.key] && "text-muted-foreground",
                  )}
                >
                  {app.details[f.key]
                    ? f.kind === "date"
                      ? formatDate(app.details[f.key], {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : app.details[f.key]
                    : "—"}
                </dd>
              </div>
            ))}
          </dl>
        </Block>

        {/* Documents */}
        <Block title="Documents" icon={FileText}>
          {docs.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : docs.isError ? (
            <QueryError message={message(docs.error, "")} onRetry={() => docs.refetch()} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {req.documents.map((d) => {
                const files = (docs.data ?? []).filter((x) => x.kind === d.kind);
                return files.length ? (
                  files.map((file) => <DocumentTile key={file.id} label={d.label} file={file} />)
                ) : (
                  <div
                    key={d.kind}
                    className="flex min-h-40 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-center"
                  >
                    <XCircle className="h-5 w-5 text-destructive" aria-hidden />
                    <span className="text-sm font-semibold">{d.label}</span>
                    <span className="text-xs text-muted-foreground">Not uploaded</span>
                  </div>
                );
              })}
            </div>
          )}
        </Block>

        {/* Checklist */}
        {(reviewing || Object.keys(saved).length > 0) && (
          <Block
            title="Reviewer checklist"
            icon={BadgeCheck}
            aside={
              app.review_checks?._at && typeof app.review_checks._at === "string" ? (
                <span className="text-xs text-muted-foreground">
                  Saved{" "}
                  {formatDate(app.review_checks._at, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : null
            }
          >
            <ul className="space-y-2">
              {REVIEW_CHECKLISTS[app.role].map((item) => {
                const id = `check-${app.id}-${item.key}`;
                return (
                  <li key={item.key}>
                    <label
                      htmlFor={id}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors",
                        checks[item.key]
                          ? "border-success/40 bg-success/5"
                          : "border-border hover:bg-secondary/50",
                        !reviewing && "cursor-default",
                      )}
                    >
                      <Checkbox
                        id={id}
                        checked={checks[item.key] === true}
                        disabled={!reviewing}
                        onCheckedChange={(v) =>
                          setChecks((c) => ({ ...c, [item.key]: v === true }))
                        }
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {item.label}
                          {!item.required && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              optional
                            </span>
                          )}
                        </span>
                        <span className="block text-xs leading-relaxed text-muted-foreground">
                          {item.hint}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {reviewing && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {complete ? "All required checks ticked." : "Required checks gate approval."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={!dirty || savingChecks}
                  onClick={() => void saveChecks()}
                >
                  {savingChecks && <Loader2 className="animate-spin" />} Save checklist
                </Button>
              </div>
            )}
            {app.role === "lawyer" && reviewing && (
              <div className="mt-4 rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
                <p className="font-semibold">In doubt? Confirm with the {CHIEF_REGISTRAR.office}</p>
                <p className="mt-1 text-muted-foreground">
                  Practising certificates are renewed every year and expire on 1 March.{" "}
                  <a
                    href={`mailto:${CHIEF_REGISTRAR.email}`}
                    className="font-medium text-brass hover:underline"
                  >
                    {CHIEF_REGISTRAR.email}
                  </a>{" "}
                  · {CHIEF_REGISTRAR.phone} ·{" "}
                  <a
                    href={CHIEF_REGISTRAR.source}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brass hover:underline"
                  >
                    Judiciary guidance
                  </a>
                </p>
              </div>
            )}
          </Block>
        )}

        {/* Decision */}
        {reviewing ? (
          <Block title="Decision" icon={Gavel}>
            <div className="flex flex-wrap gap-1.5">
              {NOTE_TEMPLATES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNote(t)}
                  className="rounded-full border border-border px-3 py-1 text-left text-xs text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                >
                  {t.split(".")[0]}
                </button>
              ))}
            </div>
            <Textarea
              className="mt-3"
              placeholder="Note to the applicant — needed to ask for changes or decline"
              value={note}
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
            />
            {approveBlocked && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                {approveBlocked}
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="brass" disabled={busy !== null || Boolean(approveBlocked)}>
                    {busy === "approve" ? <Loader2 className="animate-spin" /> : <BadgeCheck />}
                    Approve
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve {name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {app.role === "lawyer"
                        ? "They get the advocate workspace and a verified listing in the public directory. Your checklist is saved as the record of this verification."
                        : `They get the ${req.noun} workspace. Your checklist is saved as the record of this verification.`}
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
                variant="outline"
                disabled={busy !== null}
                onClick={() => void decide("changes")}
              >
                {busy === "changes" && <Loader2 className="animate-spin" />} Ask for changes
              </Button>
              <Button
                variant="destructive"
                disabled={busy !== null}
                onClick={() => void decide("reject")}
              >
                {busy === "reject" && <Loader2 className="animate-spin" />} Decline
              </Button>
            </div>
          </Block>
        ) : app.review_note ? (
          <Block title="Note to the applicant" icon={Mail}>
            <p className="rounded-xl bg-secondary/50 p-3 text-sm leading-relaxed">
              {app.review_note}
            </p>
          </Block>
        ) : null}
      </div>
    </article>
  );
}

function Block({
  title,
  icon: Icon,
  aside,
  children,
}: {
  title: string;
  icon: LucideIcon;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <Icon className="h-4 w-4 text-brass" aria-hidden /> {title}
        </h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Timeline({
  app,
  reviewerEmail,
}: {
  app: RoleApplicationRow;
  reviewerEmail: string | null;
}) {
  const steps = [
    { label: "Started", at: app.created_at, done: true },
    { label: "Sent", at: app.submitted_at, done: Boolean(app.submitted_at) },
    {
      label:
        app.status === "approved"
          ? "Approved"
          : app.status === "rejected"
            ? "Declined"
            : app.status === "changes_requested"
              ? "Changes asked"
              : "Decision",
      at: app.reviewed_at,
      done: Boolean(app.reviewed_at),
    },
  ];
  return (
    <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Progress">
      {steps.map((s) => (
        <li key={s.label} className="min-w-0">
          <span
            aria-hidden
            className={cn("block h-1 rounded-full", s.done ? "bg-brass" : "bg-white/15")}
          />
          <span className="mt-2 block text-xs font-semibold text-ink-foreground">{s.label}</span>
          <span className="block truncate text-[0.7rem] text-ink-foreground/60">
            {s.at ? formatDate(s.at, { day: "numeric", month: "short" }) : "—"}
            {s.label !== "Started" && s.label !== "Sent" && s.done && reviewerEmail
              ? ` · ${reviewerEmail}`
              : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

function DocumentTile({ label, file }: { label: string; file: ApplicationDocument }) {
  const isImage = file.mime_type?.startsWith("image/") ?? /\.(jpe?g|png|webp)$/i.test(file.name);
  const preview = useQuery({
    queryKey: ["application-document-url", file.id],
    queryFn: () => signedDocumentUrl(file, 600),
    enabled: isImage,
    staleTime: 8 * 60_000,
  });

  const open = () =>
    openApplicationDocument(file).catch((error) =>
      toast.error(message(error, "Couldn't open the document")),
    );

  return (
    <button
      type="button"
      onClick={() => void open()}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition-[border-color,box-shadow] hover:border-brass/40 hover:shadow-[var(--shadow-card-hover)]"
    >
      <span className="relative grid h-32 place-items-center overflow-hidden bg-secondary/60">
        {isImage && preview.data ? (
          <img
            src={preview.data}
            alt={`${label} (preview)`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : isImage ? (
          <ImageIcon className="h-7 w-7 text-muted-foreground" aria-hidden />
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide backdrop-blur">
          {file.mime_type?.split("/")[1] ?? "file"}
        </span>
      </span>
      <span className="p-3">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {file.name}
          {file.size_bytes ? ` · ${Math.max(1, Math.round(file.size_bytes / 1024))} KB` : ""}
        </span>
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brass">
          Open full size <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </span>
    </button>
  );
}
