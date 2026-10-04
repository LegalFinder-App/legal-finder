import { useState } from "react";
import { View } from "react-native";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingRows,
  Segmented,
  StatusPill,
  Text,
} from "@/components/ui";
import { showAlert } from "@/lib/alert";
import { REPORT_REASONS } from "@/lib/moderation";
import { useSession } from "@/lib/session";
import { supabase, unwrap } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { errorMessage, toast } from "@/lib/toast";
import type { ContentReportRow, ReportStatus } from "@/types/app-database";

// Administrators work through what people report (messages, reviews, people). The database
// notifies every administrator of each new report (20261004120000_reports_and_blocks.sql).

type View_ = "open" | "closed";

export const reportsQuery = (view: View_) =>
  queryOptions({
    queryKey: ["admin-reports", view],
    queryFn: async () => {
      const query = supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: view === "open" })
        .limit(100);
      const rows = unwrap(
        await (view === "open" ? query.eq("status", "open") : query.neq("status", "open")),
      ) as ContentReportRow[];
      const ids = [
        ...new Set(rows.flatMap((r) => [r.reporter_id, r.reported_user_id]).filter(Boolean)),
      ] as string[];
      const people = ids.length
        ? (unwrap(await supabase.from("profiles").select("id, full_name, email").in("id", ids)) as {
            id: string;
            full_name: string | null;
            email: string | null;
          }[])
        : [];
      const name = (id: string | null) => {
        if (!id) return "Unknown";
        const p = people.find((person) => person.id === id);
        return p?.full_name || p?.email || "A deleted account";
      };
      return rows.map((r) => ({
        ...r,
        reporterName: name(r.reporter_id),
        reportedName: name(r.reported_user_id),
      }));
    },
  });

const KIND: Record<string, string> = { message: "Message", review: "Review", user: "Person" };
const reasonLabel = (reason: string) =>
  REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;

export function ReportsPanel() {
  const { colors } = useTheme();
  const { user } = useSession();
  const qc = useQueryClient();
  const [view, setView] = useState<View_>("open");
  const reports = useQuery(reportsQuery(view));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const close = async (report: ContentReportRow, status: ReportStatus, removeReview = false) => {
    if (!user) return;
    setBusy(report.id);
    try {
      if (removeReview) {
        const { error } = await supabase.from("reviews").delete().eq("id", report.target_id);
        if (error) throw new Error(error.message);
      }
      const note = notes[report.id]?.trim();
      const { error } = await supabase
        .from("content_reports")
        .update({
          status,
          resolution_note: removeReview
            ? ["Review removed.", note].filter(Boolean).join(" ")
            : note || null,
          handled_by: user.id,
          handled_at: new Date().toISOString(),
        })
        .eq("id", report.id);
      if (error) throw new Error(error.message);
      toast.success(status === "dismissed" ? "Report dismissed" : "Report resolved");
      await qc.invalidateQueries({ queryKey: ["admin-reports"] });
      if (removeReview) await qc.invalidateQueries({ queryKey: ["reviews"] });
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update the report"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: "open", label: "To review" },
          { value: "closed", label: "Closed" },
        ]}
      />
      {reports.isLoading ? (
        <LoadingRows rows={3} height={120} />
      ) : reports.isError ? (
        <ErrorState
          message={errorMessage(reports.error, "Couldn't load reports")}
          onRetry={() => void reports.refetch()}
        />
      ) : (reports.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Flag size={22} color={colors.brass} />}
          title={view === "open" ? "Nothing to review" : "No closed reports yet"}
          description={
            view === "open"
              ? "Reports people send about messages, reviews or other users appear here."
              : undefined
          }
        />
      ) : (
        (reports.data ?? []).map((r) => (
          <Card key={r.id}>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {KIND[r.target_type] ?? r.target_type}: {reasonLabel(r.reason)}
                </Text>
                <StatusPill
                  value={r.status}
                  tone={
                    r.status === "open"
                      ? "warning"
                      : r.status === "resolved"
                        ? "success"
                        : "neutral"
                  }
                />
              </View>
              <Text variant="small" tone="muted">
                {r.target_type === "user" ? "Person reported" : "Written by"}: {r.reportedName}
                {"\n"}Reported by: {r.reporterName} · {formatDateTime(r.created_at)}
              </Text>
              {r.excerpt ? (
                <View
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: colors.border,
                    paddingLeft: 10,
                  }}
                >
                  <Text>{r.excerpt}</Text>
                </View>
              ) : null}
              {r.details ? (
                <Text variant="small">
                  <Text variant="small" tone="muted">
                    Reporter’s note:{" "}
                  </Text>
                  {r.details}
                </Text>
              ) : null}
              {r.status === "open" ? (
                <>
                  <Input
                    label="Note (optional)"
                    value={notes[r.id] ?? ""}
                    onChangeText={(text) => setNotes((prev) => ({ ...prev, [r.id]: text }))}
                    maxLength={2000}
                  />
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {r.target_type === "review" ? (
                      <Button
                        title="Remove review"
                        size="sm"
                        variant="destructive"
                        loading={busy === r.id}
                        onPress={() =>
                          showAlert(
                            "Remove this review?",
                            "It will no longer show on the profile.",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Remove",
                                style: "destructive",
                                onPress: () => void close(r, "resolved", true),
                              },
                            ],
                          )
                        }
                      />
                    ) : null}
                    <Button
                      title="Mark resolved"
                      size="sm"
                      loading={busy === r.id}
                      onPress={() => void close(r, "resolved")}
                    />
                    <Button
                      title="Dismiss"
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id}
                      onPress={() => void close(r, "dismissed")}
                    />
                  </View>
                  {r.target_type !== "review" ? (
                    <Text variant="caption" tone="muted">
                      To remove someone from LegalFinder, delete their account under Users.
                    </Text>
                  ) : null}
                </>
              ) : r.resolution_note ? (
                <Text variant="small" tone="muted">
                  Note: {r.resolution_note}
                </Text>
              ) : null}
            </View>
          </Card>
        ))
      )}
    </View>
  );
}
