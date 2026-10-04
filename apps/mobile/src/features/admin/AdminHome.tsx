import { useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { showAlert } from "@/lib/alert";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Briefcase,
  CreditCard,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Avatar,
  Button,
  Card,
  ChipRow,
  Chip,
  EmptyState,
  ErrorState,
  Input,
  LoadingRows,
  PageHeading,
  Screen,
  Segmented,
  StatTile,
  StatusPill,
  SwitchField,
  Text,
} from "@/components/ui";
import { AdminAnalytics } from "@/features/analytics/AdminAnalytics";
import { ContentManager } from "@/features/content/ContentManager";
import { CONTENT } from "@/features/content/configs";
import { PayoutsPanel } from "@/features/payouts/PayoutsPanel";
import { ReportsPanel, reportsQuery } from "@/features/admin/ReportsPanel";
import { ROLE_LABELS, useSession, type AppRole } from "@/lib/session";
import {
  allCasesQuery,
  allProfilesQuery,
  allUserRolesQuery,
  appSettingsQuery,
  auditLogsQuery,
  incidentReportsQuery,
  lawyersQuery,
  paymentsQuery,
  type AppSettings,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { formatDateTime, formatUGX, formatUGXCompact } from "@/lib/format";
import { useWideLayout } from "@/lib/layout";
import { toast } from "@/lib/toast";

type Tab =
  "overview" | "verify" | "reports" | "users" | "payouts" | "content" | "platform" | "audit";
const ALL_ROLES: AppRole[] = ["user", "lawyer", "police", "judiciary", "admin"];

function Overview() {
  const { colors } = useTheme();
  // Six tiles: two a row on a phone, three a row on a wide desktop window.
  const tile = useWideLayout() ? { minWidth: 240 } : undefined;
  const profiles = useQuery(allProfilesQuery);
  const lawyers = useQuery(lawyersQuery());
  const cases = useQuery(allCasesQuery);
  const reports = useQuery(incidentReportsQuery);
  const payments = useQuery(paymentsQuery);
  const verified = (lawyers.data ?? []).filter((l) => l.verified).length;
  const pending = (lawyers.data?.length ?? 0) - verified;
  const volume = (payments.data ?? [])
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + Number(p.amount), 0);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <StatTile
          label="Users"
          value={profiles.data?.length ?? "—"}
          hint="registered"
          icon={<Users size={14} color={colors.brass} />}
          style={tile}
        />
        <StatTile
          label="Verified"
          value={lawyers.data ? verified : "—"}
          hint={lawyers.data ? `of ${lawyers.data.length} advocates` : undefined}
          icon={<ShieldCheck size={14} color={colors.brass} />}
          style={tile}
        />
        <StatTile
          label="To verify"
          value={lawyers.data ? pending : "—"}
          hint="awaiting review"
          icon={<BadgeCheck size={14} color={colors.brass} />}
          style={tile}
        />
        <StatTile
          label="Open matters"
          value={cases.data ? cases.data.filter((c) => c.status === "open").length : "—"}
          hint={cases.data ? `of ${cases.data.length} in all` : undefined}
          icon={<Briefcase size={14} color={colors.brass} />}
          style={tile}
        />
        <StatTile
          label="Open reports"
          value={
            reports.data
              ? reports.data.filter((r) => r.status === "submitted" || r.status === "investigating")
                  .length
              : "—"
          }
          hint="incidents"
          icon={<ShieldAlert size={14} color={colors.brass} />}
          style={tile}
        />
        <StatTile
          label="Revenue"
          value={payments.data ? formatUGXCompact(volume) : "—"}
          hint={payments.data ? `${formatUGX(volume)} paid` : undefined}
          icon={<CreditCard size={14} color={colors.brass} />}
          style={tile}
        />
      </View>
      <AdminAnalytics />
    </View>
  );
}

function Verifications() {
  const qc = useQueryClient();
  const lawyers = useQuery(lawyersQuery());
  const [filter, setFilter] = useState<"pending" | "verified">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const rows = (lawyers.data ?? []).filter((l) =>
    filter === "pending" ? !l.verified : l.verified,
  );

  const setVerified = async (id: string, verified: boolean) => {
    setBusy(id);
    const { error } = await supabase.from("lawyers").update({ verified }).eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(verified ? "Advocate verified" : "Verification removed");
    qc.invalidateQueries({ queryKey: ["lawyers"] });
    qc.invalidateQueries({ queryKey: ["audit-logs"] });
  };

  if (lawyers.isLoading) return <LoadingRows rows={3} />;
  if (lawyers.isError)
    return (
      <ErrorState
        message={(lawyers.error as Error).message}
        onRetry={() => void lawyers.refetch()}
      />
    );
  return (
    <View style={{ gap: 12 }}>
      <ChipRow
        value={filter}
        onChange={setFilter}
        options={[
          { value: "pending", label: "Pending" },
          { value: "verified", label: "Verified" },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState
          title={filter === "pending" ? "No pending verifications" : "No verified advocates"}
        />
      ) : (
        rows.map((l) => (
          <Card key={l.id}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Avatar name={l.full_name} uri={l.photo_url} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{l.full_name}</Text>
                <Text variant="small" tone="muted">
                  Roll no. {l.bar_number ?? "not provided"} · {l.county ?? "—"}
                </Text>
              </View>
              <StatusPill value={l.license_status} />
            </View>
            <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
              Check the roll number against the official advocates roll before verifying.
            </Text>
            <Button
              title={l.verified ? "Remove verification" : "Verify advocate"}
              variant={l.verified ? "outline" : "brass"}
              size="sm"
              loading={busy === l.id}
              onPress={() => void setVerified(l.id, !l.verified)}
              style={{ marginTop: 10, alignSelf: "flex-start" }}
            />
          </Card>
        ))
      )}
    </View>
  );
}

function UsersAndRoles() {
  const { user: me } = useSession();
  const qc = useQueryClient();
  const profiles = useQuery(allProfilesQuery);
  const roles = useQuery(allUserRolesQuery);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const rolesByUser = useMemo(() => {
    const map = new Map<string, AppRole[]>();
    for (const r of roles.data ?? [])
      map.set(r.user_id, [...(map.get(r.user_id) ?? []), r.role as AppRole]);
    return map;
  }, [roles.data]);

  const term = search.trim().toLowerCase();
  const rows = (profiles.data ?? []).filter(
    (p) =>
      !term || p.full_name?.toLowerCase().includes(term) || p.email?.toLowerCase().includes(term),
  );

  const toggle = (userId: string, role: AppRole, has: boolean) => {
    if (has && userId === me?.id && role === "admin")
      return toast.error("You can't remove your own admin role.");
    const run = async () => {
      setBusy(`${userId}:${role}`);
      const { error } = has
        ? await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role)
        : await supabase.from("user_roles").insert({ user_id: userId, role });
      setBusy(null);
      if (error) return toast.error(error.message);
      toast.success(`${ROLE_LABELS[role]} role ${has ? "removed" : "added"}`);
      qc.invalidateQueries({ queryKey: ["admin-user-roles"] });
      qc.invalidateQueries({ queryKey: ["roles", userId] });
    };
    if (role === "admin" && !has) {
      showAlert(
        "Grant administrator access?",
        "Administrators can see and change everything on the platform.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Grant", style: "destructive", onPress: () => void run() },
        ],
      );
    } else void run();
  };

  if (profiles.isLoading || roles.isLoading) return <LoadingRows rows={4} />;
  if (profiles.isError)
    return (
      <ErrorState
        message={(profiles.error as Error).message}
        onRetry={() => void profiles.refetch()}
      />
    );

  return (
    <View style={{ gap: 12 }}>
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Search name or email"
        autoCapitalize="none"
      />
      {rows.slice(0, 100).map((p) => {
        const has = rolesByUser.get(p.id) ?? [];
        return (
          <Card key={p.id}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar name={p.full_name ?? p.email} uri={p.avatar_url} size={40} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{p.full_name || "Unnamed user"}</Text>
                <Text variant="small" tone="muted">
                  {p.email}
                </Text>
                {p.requested_role && !has.includes(p.requested_role as AppRole) ? (
                  <Text variant="small" tone="brass" style={{ marginTop: 2 }}>
                    Requested: {ROLE_LABELS[p.requested_role as AppRole] ?? p.requested_role}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {ALL_ROLES.map((role) => (
                <Chip
                  key={role}
                  label={`${busy === `${p.id}:${role}` ? "…" : has.includes(role) ? "✓ " : "+ "}${ROLE_LABELS[role]}`}
                  selected={has.includes(role)}
                  onPress={() => toggle(p.id, role, has.includes(role))}
                />
              ))}
            </View>
          </Card>
        );
      })}
      {rows.length > 100 ? (
        <Text variant="small" tone="muted" align="center">
          Showing 100 of {rows.length} — refine your search.
        </Text>
      ) : null}
    </View>
  );
}

function ContentHub() {
  const [key, setKey] = useState<keyof typeof CONTENT>("news");
  return (
    <View style={{ gap: 12 }}>
      <ChipRow
        value={key}
        onChange={(k) => setKey(k as keyof typeof CONTENT)}
        options={Object.entries(CONTENT).map(([k, c]) => ({ value: k, label: c.title }))}
      />
      <ContentManager key={key} config={CONTENT[key]} />
    </View>
  );
}

// app_settings isn't in the generated types (same as on the web).
const settingsTable = supabase as unknown as {
  from: (t: "app_settings") => {
    update: (v: Partial<AppSettings> & { updated_by?: string }) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

function Platform() {
  const { user } = useSession();
  const qc = useQueryClient();
  const settings = useQuery(appSettingsQuery);
  const s = settings.data;
  if (settings.isLoading || !s) return <LoadingRows rows={3} />;

  const set = async (patch: Partial<AppSettings>) => {
    const { error } = await settingsTable
      .from("app_settings")
      .update({ ...patch, updated_by: user?.id })
      .eq("id", "global");
    if (error) return toast.error(error.message);
    toast.success("Platform setting updated");
    qc.invalidateQueries({ queryKey: ["app-settings"] });
  };

  return (
    <Card>
      <View style={{ gap: 18 }}>
        <SwitchField
          label="Maintenance mode"
          description="Shows a maintenance notice to signed-in users on web and app."
          value={s.maintenance_mode}
          onChange={(v) => void set({ maintenance_mode: v })}
        />
        <SwitchField
          label="Incident reporting"
          description="Lets the public file reports to police."
          value={s.incident_reporting_enabled}
          onChange={(v) => void set({ incident_reporting_enabled: v })}
        />
        <SwitchField
          label="Wanted notices"
          description="Shows the public wanted-persons page."
          value={s.wanted_notices_enabled}
          onChange={(v) => void set({ wanted_notices_enabled: v })}
        />
        <SwitchField
          label="AI assistant"
          description="Makes the legal assistant available to signed-in users."
          value={s.ai_assistant_enabled}
          onChange={(v) => void set({ ai_assistant_enabled: v })}
        />
      </View>
    </Card>
  );
}

function Audit() {
  const { user } = useSession();
  const logs = useQuery(auditLogsQuery(user?.id));
  if (logs.isLoading) return <LoadingRows rows={5} height={60} />;
  if (logs.isError)
    return (
      <ErrorState message={(logs.error as Error).message} onRetry={() => void logs.refetch()} />
    );
  if (!(logs.data ?? []).length) return <EmptyState title="No activity recorded yet" />;
  return (
    <View style={{ gap: 8 }}>
      {(logs.data ?? []).map((l) => (
        <Card key={l.id}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <StatusPill value={l.action.toLowerCase()} />
            <Text variant="mono" tone="muted" style={{ flex: 1 }}>
              {l.table_name}
            </Text>
            <Text variant="caption" tone="muted">
              {formatDateTime(l.created_at)}
            </Text>
          </View>
          <Text variant="small" style={{ marginTop: 6 }}>
            {l.actor_name ?? "System"}
            {l.actor_role ? ` (${l.actor_role})` : ""}
          </Text>
        </Card>
      ))}
    </View>
  );
}

export function AdminHome() {
  // A notification can open a tab directly (`/?tab=reports`, see notifications.tsx).
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? "overview");
  const [linkedTab, setLinkedTab] = useState(params.tab);
  if (params.tab !== linkedTab) {
    setLinkedTab(params.tab);
    if (params.tab) setTab(params.tab);
  }
  const openReports = useQuery(reportsQuery("open")).data?.length ?? 0;
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  return (
    <Screen
      edges={["top", "left", "right"]}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await qc.invalidateQueries();
        setRefreshing(false);
      }}
    >
      <PageHeading
        eyebrow="Administration"
        title="Platform"
        description="Verify advocates, manage roles, payouts and content, and oversee activity."
      />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: "Overview" },
          { value: "verify", label: "Verify" },
          { value: "reports", label: openReports ? `Reports (${openReports})` : "Reports" },
          { value: "users", label: "Users" },
          { value: "payouts", label: "Payouts" },
          { value: "content", label: "Content" },
          { value: "platform", label: "Platform" },
          { value: "audit", label: "Audit" },
        ]}
      />
      {tab === "overview" ? <Overview /> : null}
      {tab === "verify" ? <Verifications /> : null}
      {tab === "reports" ? <ReportsPanel /> : null}
      {tab === "users" ? <UsersAndRoles /> : null}
      {tab === "payouts" ? <PayoutsPanel /> : null}
      {tab === "content" ? <ContentHub /> : null}
      {tab === "platform" ? <Platform /> : null}
      {tab === "audit" ? <Audit /> : null}
    </Screen>
  );
}
