import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Briefcase, CalendarDays, FileText, Users, Video } from "lucide-react";
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
              <div key={c.id} className="rounded-lg border border-border bg-card p-4 shadow-plate">
                <p className="font-mono text-xs text-brass">{c.reference}</p>
                <p className="mt-1 font-display text-sm font-semibold">{c.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.case_type} · {c.court ?? "Court to be assigned"}
                </p>
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
        <div key={client.id} className="rounded-lg border border-border bg-card p-4 shadow-plate">
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
      </Tabs>
    </div>
  );
}
