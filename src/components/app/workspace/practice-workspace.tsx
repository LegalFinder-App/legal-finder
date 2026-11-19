import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "@/lib/toast";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  FileText,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { myLawyerProfileQuery } from "@/lib/queries";
import { startAdvocateKycRenewal } from "@/lib/onboarding";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, LoadingRows, QueryError } from "@/components/common/bits";
import { StatCardRow } from "./shared/stat-card-row";
import { DocumentVault } from "./shared/document-vault";
import { CompliancePanel } from "./shared/compliance-panel";
import { PracticeAnalytics } from "./shared/practice-analytics";
import { HearingCalendar } from "./shared/hearing-calendar";
import { LiveCourtroomPanel } from "@/components/app/live-courtroom-panel";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { adviceConfig } from "@/components/app/admin/content/configs/advice";
import { myCasesQuery, documentsQuery, type CaseRow } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

const STATUS_OPTIONS = ["open", "hearing", "closed"];

function CasePipeline() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const cases = useQuery(myCasesQuery(user?.id));

  const rows = useMemo(() => cases.data ?? [], [cases.data]);
  const columns = useMemo(() => {
    const statuses = Array.from(new Set([...STATUS_OPTIONS, ...rows.map((c) => c.status)]));
    return statuses
      .map((status) => ({ status, items: rows.filter((c) => c.status === status) }))
      .filter((col) => col.items.length > 0 || STATUS_OPTIONS.includes(col.status));
  }, [rows]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("cases").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["cases", user?.id] });
  };

  if (cases.isLoading) return <LoadingRows rows={3} />;
  if (cases.isError) {
    return (
      <QueryError
        message={cases.error instanceof Error ? cases.error.message : undefined}
        onRetry={() => cases.refetch()}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase className="h-8 w-8" />}
        title="No matters yet"
        description="Cases assigned to you will appear here."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map((column) => (
        <div key={column.status} className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-center justify-between px-1">
            <p className="eyebrow text-muted-foreground">{column.status.replace(/_/g, " ")}</p>
            <span className="text-xs text-muted-foreground">{column.items.length}</span>
          </div>
          <div className="mt-3 space-y-3">
            {column.items.map((c) => (
              <div key={c.id} className="card p-4">
                <Link to="/cases/$caseId" params={{ caseId: c.id }} className="block">
                  <p className="font-mono text-xs text-brass">{c.reference}</p>
                  <p className="mt-1 font-display text-sm font-semibold hover:underline">
                    {c.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.case_type} · {c.court ?? "Court to be assigned"}
                  </p>
                </Link>
                <Select
                  value={c.status}
                  onValueChange={(status) => void updateStatus(c.id, status)}
                >
                  <SelectTrigger className="mt-3 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientList({ cases }: { cases: CaseRow[] }) {
  const clientIds = useMemo(() => Array.from(new Set(cases.map((c) => c.client_id))), [cases]);
  const clients = useQuery({
    queryKey: ["practice-clients", clientIds],
    enabled: clientIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").in("id", clientIds);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const matterCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cases) map.set(c.client_id, (map.get(c.client_id) ?? 0) + 1);
    return map;
  }, [cases]);

  if (clientIds.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8" />}
        title="No clients yet"
        description="Clients from your matters will appear here."
      />
    );
  }

  if (clients.isLoading) return <LoadingRows rows={3} />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(clients.data ?? []).map((client) => (
        <div key={client.id} className="card p-4">
          <p className="font-display font-semibold">{client.full_name || "Unnamed client"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{client.email}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {matterCounts.get(client.id) ?? 0} matter(s)
          </p>
        </div>
      ))}
    </div>
  );
}

function daysUntilPc(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function KycRenewalBanner({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const listing = useQuery(myLawyerProfileQuery(userId));
  const [busy, setBusy] = useState(false);
  const lawyer = listing.data;
  if (!lawyer) return null;

  const remaining = daysUntilPc(lawyer.bar_license_expires_at ?? lawyer.kyc_expires_at);
  const expired =
    lawyer.kyc_status === "expired" ||
    lawyer.license_status === "expired" ||
    (remaining !== null && remaining < 0) ||
    (!lawyer.verified && lawyer.kyc_status !== "pending");
  const expiringSoon =
    !expired &&
    (lawyer.kyc_status === "pending" ||
      lawyer.license_status === "expiring" ||
      (remaining !== null && remaining <= 30));

  if (!expired && !expiringSoon) return null;

  const renew = async () => {
    setBusy(true);
    try {
      await startAdvocateKycRenewal();
      toast.success("Renewal started", {
        description: "Upload this year’s practising certificate and a fresh selfie.",
      });
      void navigate({ to: "/apply" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start renewal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`mt-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
        expired
          ? "border-destructive/40 bg-destructive/5"
          : "border-warning/40 bg-warning/5"
      }`}
    >
      <div className="flex gap-3">
        <AlertTriangle
          className={`mt-0.5 h-5 w-5 shrink-0 ${expired ? "text-destructive" : "text-warning"}`}
        />
        <div>
          <p className="font-display text-sm font-semibold">
            {expired
              ? "Your practising certificate has expired"
              : remaining !== null
                ? `Practising certificate expires in ${remaining} day${remaining === 1 ? "" : "s"}`
                : "Practising certificate needs renewal"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {expired
              ? "Your verified listing is paused until you renew and an administrator re-checks your documents."
              : "Renew now so your verified listing stays active after the certificate date."}
          </p>
        </div>
      </div>
      <Button variant="brass" size="sm" disabled={busy} onClick={() => void renew()}>
        Renew practising certificate
      </Button>
    </div>
  );
}

export function PracticeWorkspace() {
  const { user } = useSession();
  const cases = useQuery(myCasesQuery(user?.id));
  const docs = useQuery(documentsQuery(user?.id));

  const rows = cases.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">Advocate workspace</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Practice</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Manage your case pipeline, clients, calendar, documents and published advice from one place.
      </p>

      {user?.id ? <KycRenewalBanner userId={user.id} /> : null}

      <div className="mt-8">
        <StatCardRow
          stats={[
            { label: "Open matters", value: rows.length, icon: <Briefcase className="h-4 w-4" /> },
            {
              label: "Clients",
              value: new Set(rows.map((c) => c.client_id)).size,
              icon: <Users className="h-4 w-4" />,
            },
            {
              label: "Documents",
              value: (docs.data ?? []).length,
              icon: <FileText className="h-4 w-4" />,
            },
          ]}
        />
      </div>

      <Tabs defaultValue="pipeline" className="mt-10">
        <TabsList>
          <TabsTrigger value="pipeline">
            <Briefcase className="mr-1.5 h-4 w-4" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="clients">
            <Users className="mr-1.5 h-4 w-4" /> Clients
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays className="mr-1.5 h-4 w-4" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="courtroom">
            <Video className="mr-1.5 h-4 w-4" /> Live courtroom
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-1.5 h-4 w-4" /> Documents
          </TabsTrigger>
          <TabsTrigger value="advice">
            <BookOpen className="mr-1.5 h-4 w-4" /> Advice guides
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <ShieldCheck className="mr-1.5 h-4 w-4" /> Compliance
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-1.5 h-4 w-4" /> Analytics
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="mt-6">
          <CasePipeline />
        </TabsContent>
        <TabsContent value="clients" className="mt-6">
          <ClientList cases={rows} />
        </TabsContent>
        <TabsContent value="calendar" className="mt-6">
          <HearingCalendar />
        </TabsContent>
        <TabsContent value="courtroom" className="mt-6">
          <LiveCourtroomPanel title="Your live hearings" />
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          <DocumentVault userId={user?.id} documents={docs.data ?? []} isLoading={docs.isLoading} />
        </TabsContent>
        <TabsContent value="advice" className="mt-6">
          <ContentCrudTable config={adviceConfig} />
        </TabsContent>
        <TabsContent value="compliance" className="mt-6">
          <CompliancePanel userId={user?.id} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <PracticeAnalytics userId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
