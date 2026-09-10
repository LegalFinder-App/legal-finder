import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { ClipboardList, FileText, ShieldAlert, UserSearch } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EmptyState,
  LoadingRows,
  QueryError,
  StatCard,
  StatusPill,
} from "@/components/common/bits";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { wantedConfig } from "@/components/app/admin/content/configs/wanted";
import { stationsConfig } from "@/components/app/admin/content/configs/stations";
import { incidentReportsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

const STATUS_OPTIONS = ["submitted", "investigating", "resolved", "closed"];

function IncidentTriage() {
  const queryClient = useQueryClient();
  const reports = useQuery(incidentReportsQuery);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = reports.data ?? [];
  const openCount = rows.filter((r) => r.status === "submitted").length;
  const investigatingCount = rows.filter((r) => r.status === "investigating").length;

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    const { error } = await supabase.from("incident_reports").update({ status }).eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Status updated");
    queryClient.invalidateQueries({ queryKey: ["incident-reports"] });
  };

  const saveNote = async (id: string) => {
    const note = draftNotes[id];
    if (note === undefined) return;
    setBusyId(id);
    const { error } = await supabase
      .from("incident_reports")
      .update({ officer_note: note })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Note saved");
    queryClient.invalidateQueries({ queryKey: ["incident-reports"] });
  };

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="New reports"
          value={openCount}
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        <StatCard
          label="Under investigation"
          value={investigatingCount}
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          label="Total in queue"
          value={rows.length}
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 space-y-3">
        {reports.isLoading ? (
          <LoadingRows rows={4} />
        ) : reports.isError ? (
          <QueryError
            message={reports.error instanceof Error ? reports.error.message : undefined}
            onRetry={() => reports.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState icon={<ShieldAlert className="h-8 w-8" />} title="No reports in the queue" />
        ) : (
          rows.map((report) => (
            <div
              key={report.id}
              className="rounded-lg border border-border bg-card p-5 shadow-plate"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-brass">{report.reference}</p>
                  <h3 className="mt-1 font-display text-base font-semibold capitalize">
                    {report.category}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {report.anonymous
                      ? "Anonymous report"
                      : (report.reporter_name ?? "Reporter on file")}
                    {" · "}
                    {new Date(report.created_at).toLocaleString()}
                    {report.location ? ` · ${report.location}` : ""}
                  </p>
                </div>
                <Select
                  value={report.status}
                  onValueChange={(status) => void updateStatus(report.id, status)}
                >
                  <SelectTrigger className="h-8 w-40 text-xs" disabled={busyId === report.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        <StatusPill value={status} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                {report.description}
              </p>
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Officer notes (internal)"
                  rows={2}
                  defaultValue={report.officer_note ?? ""}
                  onChange={(event) =>
                    setDraftNotes((prev) => ({ ...prev, [report.id]: event.target.value }))
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={draftNotes[report.id] === undefined || busyId === report.id}
                  onClick={() => void saveNote(report.id)}
                >
                  Save note
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function PrecinctWorkspace() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">Police workspace</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Precinct</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Triage incident reports, manage wanted-person notices and keep station details current for
        the public directory.
      </p>

      <Tabs defaultValue="triage" className="mt-8">
        <TabsList>
          <TabsTrigger value="triage">
            <ClipboardList className="mr-1.5 h-4 w-4" /> Incident triage
          </TabsTrigger>
          <TabsTrigger value="wanted">
            <UserSearch className="mr-1.5 h-4 w-4" /> Wanted persons
          </TabsTrigger>
          <TabsTrigger value="stations">
            <ShieldAlert className="mr-1.5 h-4 w-4" /> Stations
          </TabsTrigger>
        </TabsList>
        <TabsContent value="triage" className="mt-6">
          <IncidentTriage />
        </TabsContent>
        <TabsContent value="wanted" className="mt-6">
          <ContentCrudTable config={wantedConfig} />
        </TabsContent>
        <TabsContent value="stations" className="mt-6">
          <ContentCrudTable config={stationsConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
