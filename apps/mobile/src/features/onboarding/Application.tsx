import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Clock,
  FileText,
  Gavel,
  Paperclip,
  Scale,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react-native";
import type { ComponentType } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Button,
  Card,
  DateTimeField,
  Input,
  LoadingRows,
  SectionTitle,
  StatusPill,
  Text,
} from "@/components/ui";
import { showAlert } from "@/lib/alert";
import { profileQuery } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { errorMessage, toast } from "@/lib/toast";
import {
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
  type DocumentSource,
  type RoleApplicationRow,
} from "@/lib/onboarding";

const ROLE_ICONS: Record<ApplicationRole, ComponentType<{ size?: number; color?: string }>> = {
  lawyer: Scale,
  police: ShieldCheck,
  judiciary: Gavel,
};

/** True while a client has a professional application under way (or asked for one at sign-up). */
export function useApplying() {
  const { user, roles, primaryRole } = useSession();
  const profile = useQuery(profileQuery(user?.id));
  const apps = useQuery(myApplicationsQuery(user?.id));
  const requested = profile.data?.requested_role;
  const open = (apps.data ?? []).some((a) => editable(a.status) || a.status === "submitted");
  const asked =
    isApplicationRole(requested) &&
    !roles.includes(requested) &&
    !(apps.data ?? []).some((a) => a.role === requested);
  return {
    loading: profile.isLoading || apps.isLoading,
    applying: primaryRole === "user" && (open || asked),
  };
}

/**
 * The whole application: choose a role, fill in the details, attach the documents, send it, then
 * follow the review. Shown on the home tab while someone is applying, and at /apply.
 */
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
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Text tone="muted">
        Advocates, police officers and judicial officers get their own workspace once an
        administrator has checked their documents. Choose the account you need.
      </Text>
      {APPLICATION_ROLES.map((role) => {
        const Icon = ROLE_ICONS[role];
        return (
          <Card
            key={role}
            onPress={() => onPick(role)}
            accessibilityLabel={REQUIREMENTS[role].title}
          >
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <View style={[styles.iconTile, { backgroundColor: colors.accent }]}>
                <Icon size={20} color={colors.brass} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{REQUIREMENTS[role].title}</Text>
                <Text variant="small" tone="muted">
                  {REQUIREMENTS[role].documents.map((d) => d.label).join(" · ")}
                </Text>
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

function Approved({ role }: { role: ApplicationRole }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
        <BadgeCheck size={36} color={colors.success} />
        <Text variant="h3" align="center">
          Your {REQUIREMENTS[role].noun} account is active
        </Text>
        <Button title="Open your workspace" onPress={() => router.replace("/(tabs)")} />
      </View>
    </Card>
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
  const { colors } = useTheme();
  const { user } = useSession();
  const qc = useQueryClient();
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
  if (!user) return null;

  const status = app?.status ?? "draft";
  const canEdit = editable(status);
  const documents = docs.data ?? [];

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["my-applications", user.id] }),
      qc.invalidateQueries({ queryKey: ["profile", user.id] }),
      app
        ? qc.invalidateQueries({ queryKey: ["application-documents", app.id] })
        : Promise.resolve(),
    ]);
  };

  // Files belong to an application, so the first file (or save) creates the draft.
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
      toast.error(errorMessage(error, failure));
    } finally {
      setBusy(null);
    }
  };

  const addDocument = (kind: string) => {
    const upload = (source: DocumentSource) =>
      void run(
        `doc:${kind}`,
        async () => {
          const current = await save(true);
          const added = await addApplicationDocument({
            userId: user.id,
            applicationId: current.id,
            kind,
            source,
          });
          if (added) {
            await qc.invalidateQueries({ queryKey: ["application-documents", current.id] });
            setMissing([]);
          }
        },
        "Couldn't add the document",
      );
    // The desktop app has no camera roll: its file picker covers photos too.
    if (Platform.OS === "web") return upload("files");
    showAlert("Add a document", "A clear photo or a PDF, up to 10 MB.", [
      { text: "Take a photo", onPress: () => upload("camera") },
      { text: "Choose a photo", onPress: () => upload("photos") },
      { text: "Choose a PDF or file", onPress: () => upload("files") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeDocument = (doc: ApplicationDocument) =>
    void run(
      `remove:${doc.id}`,
      async () => {
        await removeApplicationDocument(doc);
        await qc.invalidateQueries({ queryKey: ["application-documents", doc.application_id] });
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

  const withdraw = () =>
    showAlert(
      "Use LegalFinder as a client?",
      app?.status === "draft"
        ? "Your unfinished application and its documents will be deleted. You can apply again at any time from More."
        : "You can apply again at any time from More.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue as a client",
          style: "destructive",
          onPress: () =>
            void run(
              "withdraw",
              async () => {
                await withdrawApplication(user.id, app);
                await refresh();
                router.replace("/(tabs)");
              },
              "Couldn't change that",
            ),
        },
      ],
    );

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text variant="h3" style={{ flex: 1 }}>
            {req.title}
          </Text>
          <StatusPill
            value={STATUS_LABELS[status]}
            tone={
              status === "submitted"
                ? "warning"
                : status === "rejected"
                  ? "destructive"
                  : status === "changes_requested"
                    ? "warning"
                    : "neutral"
            }
          />
        </View>
        {status === "submitted" ? (
          <View style={styles.notice}>
            <Clock size={18} color={colors.brass} />
            <Text variant="small" style={{ flex: 1 }}>
              Sent {formatDateTime(app?.submitted_at)}. An administrator is checking your documents,
              and you’ll get a notification when they’ve decided. Until then you can use LegalFinder
              as a client.
            </Text>
          </View>
        ) : status === "changes_requested" || status === "rejected" ? (
          <View style={styles.notice}>
            <TriangleAlert size={18} color={colors.destructive} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="small" style={{ fontWeight: "600" }}>
                {status === "rejected"
                  ? "Your application was not approved."
                  : "An administrator asked for changes:"}
              </Text>
              {app?.review_note ? <Text variant="small">{app.review_note}</Text> : null}
            </View>
          </View>
        ) : (
          <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
            {req.intro}
          </Text>
        )}
      </Card>

      <SectionTitle title="Your details" />
      <Card>
        <View style={{ gap: 12 }}>
          {req.fields.map((field) => {
            const value = details[field.key] ?? "";
            const label = field.optional ? `${field.label} (optional)` : field.label;
            if (!canEdit)
              return (
                <View key={field.key}>
                  <Text variant="small" tone="muted">
                    {field.label}
                  </Text>
                  <Text>{field.kind === "date" && value ? formatDate(value) : value || "—"}</Text>
                </View>
              );
            if (field.kind === "date")
              return (
                <DateTimeField
                  key={field.key}
                  label={label}
                  mode="date"
                  value={value ? new Date(`${value}T12:00:00`) : null}
                  minimumDate={new Date()}
                  onChange={(d) => setDetails((prev) => ({ ...prev, [field.key]: localDate(d) }))}
                />
              );
            return (
              <Input
                key={field.key}
                label={label}
                value={value}
                placeholder={field.placeholder}
                hint={field.hint}
                keyboardType={field.kind === "phone" ? "phone-pad" : "default"}
                autoCapitalize={field.kind === "phone" ? "none" : "words"}
                maxLength={200}
                onChangeText={(text) => setDetails((prev) => ({ ...prev, [field.key]: text }))}
              />
            );
          })}
        </View>
      </Card>

      <SectionTitle title="Documents" />
      {req.documents.map((doc) => {
        const files = documents.filter((d) => d.kind === doc.kind);
        return (
          <Card key={doc.kind}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <FileText size={18} color={files.length ? colors.success : colors.mutedForeground} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{doc.label}</Text>
                <Text variant="small" tone="muted">
                  {doc.hint}
                </Text>
              </View>
            </View>
            {files.map((file) => (
              <View key={file.id} style={styles.fileRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${file.name}`}
                  onPress={() =>
                    void openApplicationDocument(file).catch((e) =>
                      toast.error(errorMessage(e, "Couldn't open the document")),
                    )
                  }
                  style={{ flex: 1, flexDirection: "row", gap: 6, alignItems: "center" }}
                >
                  <Paperclip size={14} color={colors.brass} />
                  <Text variant="small" tone="brass" numberOfLines={1} style={{ flex: 1 }}>
                    {file.name}
                  </Text>
                </Pressable>
                {canEdit ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${file.name}`}
                    hitSlop={8}
                    disabled={busy === `remove:${file.id}`}
                    onPress={() => removeDocument(file)}
                  >
                    <Trash2 size={16} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {canEdit ? (
              <Button
                title={files.length ? "Add another page" : "Add document"}
                size="sm"
                variant="outline"
                loading={busy === `doc:${doc.kind}`}
                onPress={() => addDocument(doc.kind)}
                style={{ alignSelf: "flex-start", marginTop: 10 }}
              />
            ) : null}
          </Card>
        );
      })}

      {canEdit ? (
        <View style={{ gap: 10 }}>
          {missing.length ? (
            <Text variant="small" tone="destructive">
              Still needed: {missing.join(", ")}.
            </Text>
          ) : null}
          <Button
            title="Send for review"
            size="lg"
            fullWidth
            loading={busy === "send"}
            disabled={busy !== null && busy !== "send"}
            onPress={send}
          />
          <Button
            title="Save and finish later"
            variant="outline"
            fullWidth
            disabled={busy !== null}
            onPress={() => void run("save", async () => void (await save()), "Couldn't save")}
          />
        </View>
      ) : null}

      {canChangeRole ? (
        <Pressable accessibilityRole="button" onPress={onChangeRole}>
          <Text variant="small" tone="brass" align="center">
            Apply for a different kind of account
          </Text>
        </Pressable>
      ) : null}
      {status !== "submitted" ? (
        <Pressable accessibilityRole="button" onPress={withdraw}>
          <Text variant="small" tone="muted" align="center">
            I don’t need a professional account — use LegalFinder as a client
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** "2027-12-31", in the phone's own time zone (toISOString would shift it a day either way). */
function localDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const styles = StyleSheet.create({
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 10 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingLeft: 28,
  },
});
