import { useState } from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, MessageSquare, Plus } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Button,
  Card,
  DateTimeField,
  EmptyState,
  ErrorState,
  Input,
  LoadingRows,
  Screen,
  SectionTitle,
  SelectField,
  StatusPill,
  Text,
} from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { DocumentList } from "@/features/documents/DocumentList";
import { useSession } from "@/lib/session";
import { caseDeadlinesQuery, caseQuery, caseUpdatesQuery, documentsQuery } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { formatDate, formatDateTime } from "@/lib/format";
import { errorMessage, toast } from "@/lib/toast";
import type { CaseDeadlineStatus, CaseDeadlineType, CaseOutcome } from "@/types/app-database";

// Same option lists as the web's case-detail.tsx.
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
const DEADLINE_STATUSES: { value: CaseDeadlineStatus; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
];

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Deadlines({ caseId, userId }: { caseId: string; userId: string | undefined }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const deadlines = useQuery(caseDeadlinesQuery(caseId));
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CaseDeadlineType>("filing");
  const [due, setDue] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["case-deadlines", caseId] });

  const add = async () => {
    if (!userId || !title.trim() || !due) return;
    setBusy(true);
    const { error } = await supabase.from("case_deadlines").insert({
      case_id: caseId,
      title: title.trim(),
      deadline_type: type,
      due_date: toISODate(due),
      created_by: userId,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setTitle("");
    setDue(null);
    toast.success("Deadline added");
    invalidate();
  };

  const setStatus = async (id: string, status: CaseDeadlineStatus) => {
    const { error } = await supabase.from("case_deadlines").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <View style={{ gap: 12 }}>
          <Input
            label="Deadline"
            value={title}
            onChangeText={setTitle}
            placeholder="File response brief"
          />
          <SelectField label="Type" value={type} onChange={setType} options={DEADLINE_TYPES} />
          <DateTimeField label="Due date" mode="date" value={due} onChange={setDue} />
          <Button
            title="Add deadline"
            size="sm"
            icon={<Plus size={14} color={colors.brassForeground} />}
            onPress={() => void add()}
            loading={busy}
            disabled={!title.trim() || !due}
            style={{ alignSelf: "flex-start" }}
          />
        </View>
      </Card>
      {deadlines.isLoading ? (
        <LoadingRows rows={2} />
      ) : deadlines.isError ? (
        <ErrorState
          message={(deadlines.error as Error).message}
          onRetry={() => void deadlines.refetch()}
        />
      ) : (deadlines.data ?? []).length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={22} color={colors.brass} />}
          title="No deadlines tracked"
          description="Add filing dates, limitation periods or hearings to keep this matter on track."
        />
      ) : (
        (deadlines.data ?? []).map((d) => (
          <Card key={d.id}>
            <Text variant="bodyStrong">{d.title}</Text>
            <Text
              variant="small"
              tone="muted"
              style={{ textTransform: "capitalize", marginTop: 2 }}
            >
              {d.deadline_type.replace(/_/g, " ")} · Due {formatDate(d.due_date)}
            </Text>
            <View style={{ marginTop: 10 }}>
              <SelectField
                label="Status"
                value={d.status}
                onChange={(s) => void setStatus(d.id, s)}
                options={DEADLINE_STATUSES}
              />
            </View>
          </Card>
        ))
      )}
    </View>
  );
}

function Updates({
  caseId,
  userId,
  authorName,
}: {
  caseId: string;
  userId: string | undefined;
  authorName: string;
}) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const updates = useQuery(caseUpdatesQuery(caseId));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const post = async () => {
    if (!userId || !note.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("case_updates").insert({
      case_id: caseId,
      author_id: userId,
      author_name: authorName,
      note: note.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNote("");
    toast.success("Update posted");
    qc.invalidateQueries({ queryKey: ["case-updates", caseId] });
  };

  return (
    <View style={{ gap: 12 }}>
      <Input value={note} onChangeText={setNote} multiline placeholder="Post a case update…" />
      <Button
        title="Post update"
        variant="outline"
        size="sm"
        loading={busy}
        disabled={!note.trim()}
        onPress={() => void post()}
        style={{ alignSelf: "flex-start" }}
      />
      {updates.isLoading ? (
        <LoadingRows rows={2} />
      ) : (updates.data ?? []).length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={22} color={colors.brass} />}
          title="No updates yet"
          description="Case notes and status changes will appear here."
        />
      ) : (
        (updates.data ?? []).map((u) => (
          <Card key={u.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text variant="bodyStrong">{u.author_name || "Unknown"}</Text>
              <Text variant="caption" tone="muted">
                {formatDateTime(u.created_at)}
              </Text>
            </View>
            <Text style={{ marginTop: 6 }}>{u.note}</Text>
          </Card>
        ))
      )}
    </View>
  );
}

function CaseDetail({ caseId }: { caseId: string }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const matter = useQuery(caseQuery(caseId));
  const documents = useQuery(documentsQuery(user?.id));
  const caseDocs = (documents.data ?? []).filter((d) => d.case_id === caseId);

  if (matter.isLoading) {
    return (
      <Screen>
        <LoadingRows rows={4} />
      </Screen>
    );
  }
  if (matter.isError) {
    return (
      <Screen>
        <ErrorState
          message={(matter.error as Error).message}
          onRetry={() => void matter.refetch()}
        />
      </Screen>
    );
  }
  const c = matter.data;
  if (!c) {
    return (
      <Screen>
        <EmptyState
          title="Case not found"
          description="This case may not exist, or you may not have access to it."
        />
      </Screen>
    );
  }

  const setOutcome = async (outcome: CaseOutcome) => {
    const { error } = await supabase.from("cases").update({ outcome }).eq("id", caseId);
    if (error) return toast.error(errorMessage(error));
    toast.success("Outcome recorded");
    qc.invalidateQueries({ queryKey: ["case", caseId] });
    qc.invalidateQueries({ queryKey: ["cases", user?.id] });
  };

  return (
    <Screen
      refreshing={matter.isRefetching}
      onRefresh={() => {
        void matter.refetch();
        void documents.refetch();
        void qc.invalidateQueries({ queryKey: ["case-updates", caseId] });
        void qc.invalidateQueries({ queryKey: ["case-deadlines", caseId] });
      }}
    >
      <Stack.Screen options={{ title: c.reference }} />
      <View style={{ gap: 6 }}>
        <Text variant="mono" tone="brass">
          {c.reference}
        </Text>
        <Text variant="h1">{c.title}</Text>
        <Text variant="small" tone="muted">
          {c.case_type} · {c.court ?? "Court to be assigned"} · Priority: {c.priority}
        </Text>
        <StatusPill value={c.status} />
      </View>
      {c.description ? <Text style={{ lineHeight: 23 }}>{c.description}</Text> : null}

      {c.status === "closed" ? (
        <Card>
          <SelectField
            label="Outcome"
            value={c.outcome ?? null}
            onChange={(o) => void setOutcome(o)}
            options={OUTCOMES}
            placeholder="Not set"
          />
        </Card>
      ) : null}

      <SectionTitle title="Deadlines" />
      <Deadlines caseId={caseId} userId={user?.id} />

      <SectionTitle title="Documents" />
      <DocumentList
        userId={user?.id}
        caseId={caseId}
        documents={caseDocs}
        loading={documents.isLoading}
      />

      <SectionTitle title="Case updates" />
      <Updates
        caseId={caseId}
        userId={user?.id}
        authorName={user?.fullName ?? user?.email ?? "Unknown"}
      />
    </Screen>
  );
}

export default function CaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RequireAuth>
      <CaseDetail caseId={id} />
    </RequireAuth>
  );
}
