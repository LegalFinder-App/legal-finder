import { useState } from "react";
import { View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, FileText, ShieldAlert } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Button,
  Card,
  ChipRow,
  EmptyState,
  ErrorState,
  Input,
  LoadingRows,
  PageHeading,
  Screen,
  Segmented,
  SelectField,
  StatTile,
  Text,
} from "@/components/ui";
import { ContentManager } from "@/features/content/ContentManager";
import { CONTENT } from "@/features/content/configs";
import { incidentReportsQuery, type IncidentReport } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/lib/toast";

// Same statuses as the web's precinct-workspace.tsx.
const STATUSES = ["submitted", "investigating", "resolved", "closed"].map((s) => ({
  value: s,
  label: s[0].toUpperCase() + s.slice(1),
}));

function ReportCard({ report }: { report: IncidentReport }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(report.officer_note ?? "");
  const [busy, setBusy] = useState(false);

  const update = async (patch: Partial<IncidentReport>, message: string) => {
    setBusy(true);
    const { error } = await supabase.from("incident_reports").update(patch).eq("id", report.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(message);
    qc.invalidateQueries({ queryKey: ["incident-reports"] });
  };

  return (
    <Card>
      <Text variant="mono" tone="brass">
        {report.reference}
      </Text>
      <Text variant="h3" style={{ marginTop: 2, textTransform: "capitalize" }}>
        {report.category}
      </Text>
      <Text variant="small" tone="muted">
        {report.anonymous ? "Anonymous report" : (report.reporter_name ?? "Reporter on file")} ·{" "}
        {formatDateTime(report.created_at)}
        {report.location ? ` · ${report.location}` : ""}
      </Text>
      <Text style={{ marginTop: 10, lineHeight: 22 }}>{report.description}</Text>
      <View style={{ gap: 10, marginTop: 12 }}>
        <SelectField
          label="Status"
          value={report.status}
          onChange={(status) => void update({ status }, "Status updated")}
          options={STATUSES}
        />
        <Input label="Officer notes (internal)" value={note} onChangeText={setNote} multiline />
        <Button
          title="Save note"
          size="sm"
          variant="outline"
          loading={busy}
          disabled={note === (report.officer_note ?? "")}
          onPress={() => void update({ officer_note: note }, "Note saved")}
          style={{ alignSelf: "flex-start" }}
        />
      </View>
    </Card>
  );
}

function Triage() {
  const { colors } = useTheme();
  const reports = useQuery(incidentReportsQuery);
  const [filter, setFilter] = useState("open");
  const rows = reports.data ?? [];
  const shown = rows.filter((r) =>
    filter === "open"
      ? r.status === "submitted" || r.status === "investigating"
      : filter === "all" || r.status === filter,
  );

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <StatTile
          label="New"
          value={rows.filter((r) => r.status === "submitted").length}
          icon={<ShieldAlert size={14} color={colors.brass} />}
        />
        <StatTile
          label="Investigating"
          value={rows.filter((r) => r.status === "investigating").length}
          icon={<ClipboardList size={14} color={colors.brass} />}
        />
        <StatTile
          label="In queue"
          value={rows.length}
          icon={<FileText size={14} color={colors.brass} />}
        />
      </View>
      <ChipRow
        value={filter}
        onChange={setFilter}
        options={[
          { value: "open", label: "Needs action" },
          { value: "resolved", label: "Resolved" },
          { value: "closed", label: "Closed" },
          { value: "all", label: "All" },
        ]}
      />
      {reports.isLoading ? (
        <LoadingRows rows={4} height={140} />
      ) : reports.isError ? (
        <ErrorState
          message={(reports.error as Error).message}
          onRetry={() => void reports.refetch()}
        />
      ) : shown.length === 0 ? (
        <EmptyState icon={<ShieldAlert size={22} color={colors.brass} />} title="No reports here" />
      ) : (
        shown.map((r) => <ReportCard key={r.id} report={r} />)
      )}
    </View>
  );
}

export function PrecinctHome() {
  const [tab, setTab] = useState<"triage" | "wanted" | "stations">("triage");
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  return (
    <Screen
      edges={["top", "left", "right"]}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await qc.invalidateQueries({ queryKey: ["incident-reports"] });
        await qc.invalidateQueries({ queryKey: ["admin-content"] });
        setRefreshing(false);
      }}
    >
      <PageHeading
        eyebrow="Police workspace"
        title="Precinct"
        description="Triage incident reports, publish wanted notices and keep station details current."
      />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "triage", label: "Incident triage" },
          { value: "wanted", label: "Wanted" },
          { value: "stations", label: "Stations" },
        ]}
      />
      {tab === "triage" ? <Triage /> : null}
      {tab === "wanted" ? <ContentManager config={CONTENT.wanted} /> : null}
      {tab === "stations" ? <ContentManager config={CONTENT.stations} /> : null}
    </Screen>
  );
}
