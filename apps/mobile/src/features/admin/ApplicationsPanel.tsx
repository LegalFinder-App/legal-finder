import { useState } from "react";
import { Pressable, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Paperclip } from "lucide-react-native";
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
import { allProfilesQuery } from "@/lib/queries";
import { formatDate, formatDateTime } from "@/lib/format";
import { errorMessage, toast } from "@/lib/toast";
import {
  REQUIREMENTS,
  STATUS_LABELS,
  applicationDocumentsQuery,
  applicationsQuery,
  openApplicationDocument,
  reviewApplication,
  type ApplicationStatus,
  type RoleApplicationRow,
} from "@/lib/onboarding";

// Administrators approve advocate, police and judiciary accounts here — the only way those roles
// are granted (20261005090000_professional_onboarding.sql). Every new application notifies them.

type View_ = "review" | "waiting" | "decided";
const VIEWS: Record<View_, ApplicationStatus[]> = {
  review: ["submitted"],
  waiting: ["draft", "changes_requested"],
  decided: ["approved", "rejected"],
};

export const applicationsToReviewQuery = applicationsQuery(VIEWS.review);

export function ApplicationsPanel() {
  const { colors } = useTheme();
  const [view, setView] = useState<View_>("review");
  const apps = useQuery(applicationsQuery(VIEWS[view]));
  const profiles = useQuery(allProfilesQuery);
  const email = (userId: string) => profiles.data?.find((p) => p.id === userId)?.email ?? null;

  return (
    <View style={{ gap: 12 }}>
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: "review", label: "To review" },
          { value: "waiting", label: "With applicant" },
          { value: "decided", label: "Decided" },
        ]}
      />
      {apps.isLoading ? (
        <LoadingRows rows={3} height={140} />
      ) : apps.isError ? (
        <ErrorState
          message={errorMessage(apps.error, "Couldn't load applications")}
          onRetry={() => void apps.refetch()}
        />
      ) : (apps.data ?? []).length === 0 ? (
        <EmptyState
          icon={<BadgeCheck size={22} color={colors.brass} />}
          title={view === "review" ? "Nothing to review" : "No applications here"}
          description={
            view === "review"
              ? "Advocate, police and judiciary applications appear here once they're sent."
              : undefined
          }
        />
      ) : (
        (apps.data ?? []).map((app) => (
          <ApplicationCard key={app.id} app={app} email={email(app.user_id)} />
        ))
      )}
    </View>
  );
}

function ApplicationCard({ app, email }: { app: RoleApplicationRow; email: string | null }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const req = REQUIREMENTS[app.role];
  const docs = useQuery(applicationDocumentsQuery(app.id));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (decision: "approve" | "changes" | "reject") => {
    setBusy(decision);
    try {
      await reviewApplication(app.id, decision, note);
      toast.success(
        decision === "approve"
          ? `${app.details.full_name || "Applicant"} is now ${req.noun === "advocate" ? "an advocate" : `on ${req.noun}`}`
          : decision === "changes"
            ? "Changes requested"
            : "Application declined",
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-applications"] }),
        qc.invalidateQueries({ queryKey: ["admin-user-roles"] }),
        qc.invalidateQueries({ queryKey: ["lawyers"] }),
      ]);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't record the decision"));
    } finally {
      setBusy(null);
    }
  };

  const confirmApprove = () =>
    showAlert(
      `Approve ${app.details.full_name || "this applicant"}?`,
      app.role === "lawyer"
        ? "They get the advocate workspace and a verified listing in the directory. Approve only once you've checked their documents against the Roll."
        : `They get the ${req.noun} workspace. Approve only once you've checked their documents.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Approve", onPress: () => void decide("approve") },
      ],
    );

  const needNote = (decision: "changes" | "reject") => {
    if (!note.trim()) {
      toast.error("Write a note first", {
        description: "Say what the applicant needs to know or change.",
      });
      return;
    }
    void decide(decision);
  };

  return (
    <Card>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {app.details.full_name || "Unnamed"} · {req.noun}
          </Text>
          <StatusPill
            value={STATUS_LABELS[app.status]}
            tone={
              app.status === "approved"
                ? "success"
                : app.status === "rejected"
                  ? "destructive"
                  : app.status === "submitted"
                    ? "warning"
                    : "neutral"
            }
          />
        </View>
        <Text variant="small" tone="muted">
          {email ?? "No email on file"}
          {app.submitted_at ? ` · sent ${formatDateTime(app.submitted_at)}` : ""}
        </Text>

        <View style={{ gap: 4 }}>
          {req.fields.map((f) => {
            const value = app.details[f.key];
            if (!value) return null;
            return (
              <Text key={f.key} variant="small">
                <Text variant="small" tone="muted">
                  {f.label}:{" "}
                </Text>
                {f.kind === "date" ? formatDate(value) : value}
              </Text>
            );
          })}
        </View>

        <View style={{ gap: 6 }}>
          {docs.isLoading ? (
            <LoadingRows rows={1} height={20} />
          ) : (
            req.documents.map((d) => {
              const files = (docs.data ?? []).filter((x) => x.kind === d.kind);
              return (
                <View key={d.kind}>
                  <Text variant="small" tone={files.length ? "default" : "destructive"}>
                    {d.label}
                    {files.length ? "" : " — missing"}
                  </Text>
                  {files.map((file) => (
                    <Pressable
                      key={file.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${file.name}`}
                      onPress={() =>
                        void openApplicationDocument(file).catch((e) =>
                          toast.error(errorMessage(e, "Couldn't open the document")),
                        )
                      }
                      style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingTop: 4 }}
                    >
                      <Paperclip size={14} color={colors.brass} />
                      <Text variant="small" tone="brass" numberOfLines={1} style={{ flex: 1 }}>
                        {file.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              );
            })
          )}
        </View>

        {app.status === "submitted" ? (
          <>
            <Input
              label="Note to the applicant"
              hint="Needed to ask for changes or decline. Sent to them with the decision."
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={2000}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Button
                title="Approve"
                size="sm"
                loading={busy === "approve"}
                disabled={busy !== null}
                onPress={confirmApprove}
              />
              <Button
                title="Ask for changes"
                size="sm"
                variant="outline"
                loading={busy === "changes"}
                disabled={busy !== null}
                onPress={() => needNote("changes")}
              />
              <Button
                title="Decline"
                size="sm"
                variant="destructive"
                loading={busy === "reject"}
                disabled={busy !== null}
                onPress={() => needNote("reject")}
              />
            </View>
          </>
        ) : app.review_note ? (
          <Text variant="small" tone="muted">
            Note: {app.review_note}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
