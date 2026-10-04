import { useRef, useState, type ChangeEvent, type ComponentType } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Clock,
  FileText,
  Gavel,
  Loader2,
  Paperclip,
  Scale,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingRows } from "@/components/common/bits";
import { profileQuery } from "@/lib/queries";
import { ROLE_HOME, useSession } from "@/lib/session";
import {
  ACCEPTED_DOCUMENT_TYPES,
  APPLICATION_ROLES,
  REQUIREMENTS,
  STATUS_LABELS,
  addApplicationDocument,
  applicationDocumentsQuery,
  editable,
  isApplicationRole,
  missingItems,
  myApplicationsQuery,
  openApplicationDocument,
  removeApplicationDocument,
  saveApplication,
  startApplication,
  submitApplication,
  withdrawApplication,
  type ApplicationDocument,
  type ApplicationRole,
  type RoleApplicationRow,
} from "@/lib/onboarding";

// The website's application screen; the app's is apps/mobile/src/features/onboarding.

const ROLE_ICONS: Record<ApplicationRole, ComponentType<{ className?: string }>> = {
  lawyer: Scale,
  police: ShieldCheck,
  judiciary: Gavel,
};

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export function ApplicationPage({ initialRole }: { initialRole?: ApplicationRole | null }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">Professional account</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Apply for access</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Send your details and documents. An administrator checks them before your account is
        switched on.
      </p>
      <div className="mt-8">
        <ApplicationView initialRole={initialRole} />
      </div>
    </div>
  );
}

export function ApplicationView({ initialRole }: { initialRole?: ApplicationRole | null }) {
  const { user, roles } = useSession();
  const profile = useQuery(profileQuery(user?.id));
  const apps = useQuery(myApplicationsQuery(user?.id));
  const [picked, setPicked] = useState<ApplicationRole | null>(initialRole ?? null);

  if (!user || profile.isLoading || apps.isLoading) return <LoadingRows rows={4} />;

  const requested = isApplicationRole(profile.data?.requested_role)
    ? profile.data.requested_role
    : null;
  const open = (apps.data ?? []).find((a) => editable(a.status) || a.status === "submitted");
  // An explicit choice, then an application under way, then the role picked at sign-up.
  const role = picked ?? open?.role ?? requested;

  if (!role) return <RolePicker onPick={setPicked} />;
  if (roles.includes(role)) return <Approved role={role} />;

  const application = (apps.data ?? []).find((a) => a.role === role) ?? null;
  return (
    <ApplicationForm
      key={role}
      role={role}
      application={application}
      canChangeRole={!application}
      onChangeRole={() => setPicked(null)}
    />
  );
}

function RolePicker({ onPick }: { onPick: (role: ApplicationRole) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Advocates, police officers and judicial officers get their own workspace once an
        administrator has checked their documents. Choose the account you need.
      </p>
      {APPLICATION_ROLES.map((role) => {
        const Icon = ROLE_ICONS[role];
        return (
          <button
            key={role}
            type="button"
            onClick={() => onPick(role)}
            className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-plate hover:border-brass/60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brass/10 text-brass">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-display font-semibold">{REQUIREMENTS[role].title}</span>
              <span className="block text-sm text-muted-foreground">
                {REQUIREMENTS[role].documents.map((d) => d.label).join(" · ")}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Approved({ role }: { role: ApplicationRole }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center shadow-plate">
      <BadgeCheck className="h-9 w-9 text-success" />
      <p className="font-display text-xl font-semibold">
        Your {REQUIREMENTS[role].noun} account is active
      </p>
      <Button variant="brass" onClick={() => void navigate({ to: ROLE_HOME[role] })}>
        Open your workspace
      </Button>
    </div>
  );
}

function ApplicationForm({
  role,
  application,
  canChangeRole,
  onChangeRole,
}: {
  role: ApplicationRole;
  application: RoleApplicationRow | null;
  canChangeRole: boolean;
  onChangeRole: () => void;
}) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const req = REQUIREMENTS[role];
  // The draft made by the first upload or save, until the applications list catches up.
  const [created, setCreated] = useState<RoleApplicationRow | null>(null);
  const app = application ?? created;
  const docs = useQuery(applicationDocumentsQuery(app?.id));
  const [details, setDetails] = useState<Record<string, string>>(() => ({
    full_name: user?.fullName ?? "",
    ...(application?.details ?? {}),
  }));
  const [busy, setBusy] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadKind, setUploadKind] = useState<string | null>(null);
  if (!user) return null;

  const status = app?.status ?? "draft";
  const canEdit = editable(status);
  const documents = docs.data ?? [];

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-applications", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] }),
      app
        ? queryClient.invalidateQueries({ queryKey: ["application-documents", app.id] })
        : Promise.resolve(),
    ]);
  };

  const save = async (quiet = false): Promise<RoleApplicationRow> => {
    let current = app;
    if (current) await saveApplication(current.id, details);
    else {
      current = await startApplication(user.id, role, details);
      setCreated(current);
      await refresh();
    }
    if (!quiet) toast.success("Saved", { description: "You can finish your application later." });
    return current;
  };

  const run = async (key: string, task: () => Promise<void>, failure: string) => {
    setBusy(key);
    try {
      await task();
    } catch (error) {
      toast.error(message(error, failure));
    } finally {
      setBusy(null);
    }
  };

  const chooseFile = (kind: string) => {
    setUploadKind(kind);
    fileInput.current?.click();
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const kind = uploadKind;
    if (!file || !kind) return;
    void run(
      `doc:${kind}`,
      async () => {
        const current = await save(true);
        await addApplicationDocument({ userId: user.id, applicationId: current.id, kind, file });
        await queryClient.invalidateQueries({ queryKey: ["application-documents", current.id] });
        setMissing([]);
      },
      "Couldn't add the document",
    );
  };

  const removeDocument = (doc: ApplicationDocument) =>
    void run(
      `remove:${doc.id}`,
      async () => {
        await removeApplicationDocument(doc);
        await queryClient.invalidateQueries({
          queryKey: ["application-documents", doc.application_id],
        });
      },
      "Couldn't remove the document",
    );

  const send = () =>
    void run(
      "send",
      async () => {
        const current = await save(true);
        const still = missingItems(role, details, documents);
        setMissing(still);
        if (still.length) {
          toast.error("A few things are still missing", { description: still.join(", ") });
          return;
        }
        await submitApplication(current.id);
        await refresh();
        toast.success("Application sent", {
          description: "An administrator will check your documents and let you know.",
        });
      },
      "Couldn't send your application",
    );

  const withdraw = () => {
    const confirmed = window.confirm(
      app?.status === "draft"
        ? "Use LegalFinder as a client? Your unfinished application and its documents will be deleted. You can apply again at any time."
        : "Use LegalFinder as a client? You can apply again at any time.",
    );
    if (!confirmed) return;
    void run(
      "withdraw",
      async () => {
        await withdrawApplication(user.id, app);
        await refresh();
        void navigate({ to: "/dashboard" });
      },
      "Couldn't change that",
    );
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_DOCUMENT_TYPES.join(",")}
        className="sr-only"
        onChange={onFile}
      />

      <section className="rounded-xl border border-border bg-card p-6 shadow-plate">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{req.title}</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              status === "rejected"
                ? "bg-destructive/15 text-destructive"
                : status === "submitted" || status === "changes_requested"
                  ? "bg-warning/20 text-warning-foreground"
                  : "bg-secondary text-secondary-foreground"
            }`}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
        {status === "submitted" ? (
          <p className="mt-3 flex gap-2 text-sm">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
            <span>
              Sent {app?.submitted_at ? new Date(app.submitted_at).toLocaleString() : ""}. An
              administrator is checking your documents, and you’ll get a notification when they’ve
              decided. Until then you can use LegalFinder as a client.
            </span>
          </p>
        ) : status === "changes_requested" || status === "rejected" ? (
          <div className="mt-3 flex gap-2 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">
                {status === "rejected"
                  ? "Your application was not approved."
                  : "An administrator asked for changes:"}
              </p>
              {app?.review_note ? (
                <p className="mt-1 whitespace-pre-wrap">{app.review_note}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{req.intro}</p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-plate">
        <h2 className="font-display text-lg font-semibold">Your details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {req.fields.map((field) => {
            const value = details[field.key] ?? "";
            const id = `application-${field.key}`;
            return (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={id}>
                  {field.label}
                  {field.optional ? (
                    <span className="text-muted-foreground"> (optional)</span>
                  ) : null}
                </Label>
                {canEdit ? (
                  <Input
                    id={id}
                    type={field.kind === "date" ? "date" : field.kind === "phone" ? "tel" : "text"}
                    value={value}
                    placeholder={field.placeholder}
                    maxLength={200}
                    min={field.kind === "date" ? new Date().toISOString().slice(0, 10) : undefined}
                    onChange={(event) =>
                      setDetails((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm">{value || "—"}</p>
                )}
                {canEdit && field.hint ? (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-plate">
        <h2 className="font-display text-lg font-semibold">Documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A clear photo or a PDF, up to 10 MB each.
        </p>
        <ul className="mt-4 divide-y divide-border">
          {req.documents.map((doc) => {
            const files = documents.filter((d) => d.kind === doc.kind);
            return (
              <li key={doc.kind} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <FileText
                    className={`mt-0.5 h-4 w-4 shrink-0 ${files.length ? "text-success" : "text-muted-foreground"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{doc.label}</p>
                    <p className="text-sm text-muted-foreground">{doc.hint}</p>
                    {files.map((file) => (
                      <div key={file.id} className="mt-2 flex items-center gap-2 text-sm">
                        <button
                          type="button"
                          className="flex min-w-0 items-center gap-1.5 text-brass hover:underline"
                          onClick={() =>
                            void openApplicationDocument(file).catch((e) =>
                              toast.error(message(e, "Couldn't open the document")),
                            )
                          }
                        >
                          <Paperclip className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </button>
                        {canEdit ? (
                          <button
                            type="button"
                            aria-label={`Remove ${file.name}`}
                            className="text-muted-foreground hover:text-destructive"
                            disabled={busy === `remove:${file.id}`}
                            onClick={() => removeDocument(file)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => chooseFile(doc.kind)}
                    >
                      {busy === `doc:${doc.kind}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {files.length ? "Add another" : "Add"}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {canEdit ? (
        <div className="space-y-3">
          {missing.length ? (
            <p className="text-sm text-destructive">Still needed: {missing.join(", ")}.</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button variant="brass" disabled={busy !== null} onClick={send}>
              {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send for review
            </Button>
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => void run("save", async () => void (await save()), "Couldn't save")}
            >
              Save and finish later
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 text-sm">
        {canChangeRole ? (
          <button
            type="button"
            className="self-start text-brass hover:underline"
            onClick={onChangeRole}
          >
            Apply for a different kind of account
          </button>
        ) : null}
        {status !== "submitted" ? (
          <button
            type="button"
            className="self-start text-muted-foreground hover:underline"
            onClick={withdraw}
          >
            I don’t need a professional account — use LegalFinder as a client
          </button>
        ) : null}
      </div>
    </div>
  );
}
