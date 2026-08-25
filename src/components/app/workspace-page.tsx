import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, CalendarDays, FileText, Gavel, ShieldAlert, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, StatusPill, EmptyState, LoadingRows } from "@/components/common/bits";
import { useSession, ROLE_LABELS } from "@/lib/session";
import {
  myCasesQuery,
  appointmentsQuery,
  documentsQuery,
  conversationsQuery,
  incidentReportsQuery,
  judgementsQuery,
  notificationsQuery,
  pushSubscriptionsQuery,
} from "@/lib/queries";
import { DEMO_APPOINTMENTS, DEMO_CASES, DEMO_DOCUMENTS } from "@/lib/demo-data";
import { supabase } from "@/integrations/supabase/client";
import { requestBrowserNotificationPermission } from "@/lib/platform-notifications";
import { subscribeBrowserPush, unsubscribeBrowserPush } from "@/lib/platform-notifications";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { LiveCourtroomPanel } from "@/components/app/live-courtroom-panel";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function WorkspacePage({ surface, title }: { surface: string; title: string }) {
  const { user, primaryRole } = useSession();
  const queryClient = useQueryClient();
  const cases = useQuery(myCasesQuery(user?.id));
  const appts = useQuery(appointmentsQuery(user?.id));
  const docs = useQuery(documentsQuery(user?.id));
  const convos = useQuery(conversationsQuery(user?.id));
  const notifications = useQuery(notificationsQuery(user?.id));
  const pushSubscriptions = useQuery(pushSubscriptionsQuery(user?.id));
  const reports = useQuery({ ...incidentReportsQuery, enabled: surface === "precinct" });
  const judgements = useQuery({ ...judgementsQuery, enabled: surface === "bench" });
  const [pushSupported, setPushSupported] = useState(false);
  const { canInstall, promptInstall } = usePwaInstall();

  useEffect(() => {
    setPushSupported(
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window,
    );
  }, []);

  const enableNotifications = async () => {
    const permission = await requestBrowserNotificationPermission();
    if (permission === "granted") {
      toast.success("Browser notifications enabled");
    }
  };

  const enablePush = async () => {
    if (!user?.id) return;
    try {
      await subscribeBrowserPush(user.id);
      toast.success("Device registered for push notifications");
      notifications.refetch();
      pushSubscriptions.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to register device");
    }
  };

  const disablePush = async () => {
    if (!user?.id) return;
    try {
      await unsubscribeBrowserPush(user.id);
      toast.success("Push notifications disabled for this device");
      pushSubscriptions.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to disable push");
    }
  };

  const [uploading, setUploading] = useState(false);
  const [demoUploads, setDemoUploads] = useState<
    Array<{
      id: string;
      name: string;
      category: string;
      size_bytes: number;
      created_at: string;
      href?: string;
    }>
  >([]);

  const liveCases = cases.data ?? [];
  const liveAppts = appts.data ?? [];
  const liveDocs = docs.data ?? [];
  const caseRows = liveCases.length > 0 ? liveCases : [...DEMO_CASES];
  const appointmentRows = liveAppts.length > 0 ? liveAppts : [...DEMO_APPOINTMENTS];
  const documentRows =
    liveDocs.length > 0
      ? liveDocs.map((document) => ({
          id: document.id,
          name: document.name,
          category: document.category ?? "general",
          size_bytes: document.size_bytes ?? 0,
          created_at: document.created_at,
          href: undefined as string | undefined,
        }))
      : [...DEMO_DOCUMENTS, ...demoUploads];
  const usingDemoDocs = liveDocs.length === 0;

  const uploadDocument = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !user?.id) return;

    setUploading(true);
    const storagePath = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      // Presentation fallback when storage buckets are not wired yet.
      const objectUrl = URL.createObjectURL(file);
      setDemoUploads((prev) => [
        {
          id: `local-${Date.now()}`,
          name: file.name,
          category: "general",
          size_bytes: file.size,
          created_at: new Date().toISOString(),
          href: objectUrl,
        },
        ...prev,
      ]);
      setUploading(false);
      toast.message("Saved as demo upload", {
        description: "Storage is using local presentation mode for this session.",
      });
      return;
    }

    const { error: recordError } = await supabase.from("documents").insert({
      owner_id: user.id,
      name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
      category: "general",
    });
    setUploading(false);

    if (recordError) {
      await supabase.storage.from("documents").remove([storagePath]);
      toast.error(recordError.message);
      return;
    }

    toast.success("Document uploaded");
    queryClient.invalidateQueries({ queryKey: ["documents", user.id] });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">{ROLE_LABELS[primaryRole]} workspace</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{title}</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open matters"
          value={caseRows.length}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard
          label="Appointments"
          value={appointmentRows.length}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <StatCard
          label="Documents"
          value={documentRows.length}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Conversations"
          value={convos.data?.length ?? 0}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {surface === "dashboard" && (
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Notifications</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Real-time alerts for cases, messages, appointments and admin activity.
              </p>
            </div>
            {typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission !== "granted" && (
                <Button variant="outline" size="sm" onClick={enableNotifications}>
                  Enable notifications
                </Button>
              )}
          </div>
          <div className="mt-4 rounded-lg border border-border bg-card p-5 shadow-plate">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-base font-semibold">Device push registration</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pushSubscriptions.data?.length
                    ? `${pushSubscriptions.data.length} registered device(s) for this account.`
                    : pushSupported
                      ? "This device can be registered for push delivery."
                      : "Push registration is unavailable in this browser."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={enablePush} disabled={!pushSupported}>
                  Register this device
                </Button>
                <Button variant="ghost" size="sm" onClick={disablePush}>
                  Remove device
                </Button>
              </div>
            </div>
          </div>
          {(canInstall || surface === "dashboard") && (
            <div className="mt-4 rounded-lg border border-border bg-card p-5 shadow-plate">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-base font-semibold">Installable app shell</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Works as an installable app on Android, iPhone/iPad, and desktop browsers that
                    support PWA installation.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void promptInstall()}
                  disabled={!canInstall}
                >
                  Install app
                </Button>
              </div>
            </div>
          )}
          <div className="mt-4 space-y-3">
            {(notifications.data ?? []).length === 0 ? (
              <EmptyState
                title="No notifications yet"
                description="You’ll see live updates here as soon as activity arrives."
              />
            ) : (
              (notifications.data ?? []).slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  className="rounded-lg border border-border bg-card p-5 shadow-plate"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display font-semibold">{n.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {n.body ?? "Open the workspace for details."}
                      </p>
                    </div>
                    <StatusPill value={n.read ? "resolved" : "pending"} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          {(surface === "bench" || surface === "practice") && (
            <section className="lg:col-span-2">
              <LiveCourtroomPanel
                title={surface === "bench" ? "Live court trials" : "Live case conferences"}
              />
            </section>
          )}
          <h2 className="font-display text-xl font-semibold">Matters</h2>
          <div className="mt-4 space-y-3">
            {cases.isLoading ? (
              <LoadingRows rows={3} />
            ) : (cases.data ?? []).length === 0 ? (
              <EmptyState
                title="No matters yet"
                description="Cases you're party to will appear here."
              />
            ) : (
              (cases.data ?? []).map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs text-brass">{c.reference}</p>
                    <StatusPill value={c.status} />
                  </div>
                  <p className="mt-2 font-display font-semibold">{c.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.case_type} · {c.court ?? "Court to be assigned"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Upcoming appointments</h2>
          <div className="mt-4 space-y-3">
            {(appts.data ?? []).length === 0 ? (
              <EmptyState
                title="Nothing scheduled"
                description="Book a consultation from any advocate profile."
              />
            ) : (
              (appts.data ?? []).map((a) => (
                <div key={a.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display font-semibold">{a.subject}</p>
                    <StatusPill value={a.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(a.scheduled_at).toLocaleString()} · {a.mode}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Document vault</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Store pleadings, evidence and correspondence in your secure vault.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="file"
                className="hidden"
                disabled={uploading || !user?.id}
                onChange={(event) => void uploadDocument(event.target.files)}
              />
              <Button variant="outline" size="sm" disabled={uploading} asChild>
                <span>
                  <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload file"}
                </span>
              </Button>
            </label>
          </div>
          <div className="mt-4 space-y-3">
            {(docs.data ?? []).length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="No documents yet"
                description="Upload filings, contracts or evidence to keep them with your matters."
              />
            ) : (
              (docs.data ?? []).map((document) => (
                <div key={document.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display font-semibold">{document.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground capitalize">
                        {document.category} ·{" "}
                        {document.size_bytes
                          ? `${Math.max(1, Math.round(document.size_bytes / 1024))} KB`
                          : "Size unknown"}
                      </p>
                    </div>
                    <StatusPill value="active" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Added {new Date(document.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {surface === "precinct" && (
          <section className="lg:col-span-2">
            <h2 className="font-display text-xl font-semibold">Incident reports</h2>
            <div className="mt-4 space-y-3">
              {(reports.data ?? []).length === 0 ? (
                <EmptyState
                  icon={<ShieldAlert className="h-8 w-8" />}
                  title="No reports in the queue"
                />
              ) : (
                (reports.data ?? []).map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-xs text-brass">{r.reference}</p>
                      <StatusPill value={r.status} />
                    </div>
                    <p className="mt-2 text-sm capitalize">{r.category}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {r.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {surface === "bench" && (
          <section className="lg:col-span-2">
            <h2 className="font-display text-xl font-semibold">Published judgements</h2>
            <div className="mt-4 space-y-3">
              {(judgements.data ?? []).length === 0 ? (
                <EmptyState icon={<Gavel className="h-8 w-8" />} title="No judgements published" />
              ) : (
                (judgements.data ?? []).map((j) => (
                  <div key={j.id} className="rounded-lg border border-border bg-card p-5">
                    <p className="font-mono text-xs text-brass">{j.case_number}</p>
                    <p className="mt-1 font-display font-semibold">{j.title}</p>
                    <p className="text-sm text-muted-foreground">{j.court}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
