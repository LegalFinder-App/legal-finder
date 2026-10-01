import { useMemo, useState } from "react";
import { View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  CalendarDays,
  CreditCard,
  FileText,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Avatar,
  Button,
  Card,
  DateTimeField,
  EmptyState,
  ErrorState,
  Input,
  LoadingRows,
  PageHeading,
  Screen,
  Segmented,
  SelectField,
  StatTile,
  StatusPill,
  SwitchField,
  Text,
} from "@/components/ui";
import { AppointmentItem, MatterItem } from "@/features/shared/Items";
import { PracticeAnalytics } from "@/features/analytics/PracticeAnalytics";
import { ContentManager } from "@/features/content/ContentManager";
import { CONTENT } from "@/features/content/configs";
import { useSession } from "@/lib/session";
import { useNow } from "@/lib/time";
import {
  appointmentsQuery,
  documentsQuery,
  lawyerCpdRecordsQuery,
  myCasesQuery,
  myLawyerProfileQuery,
  paymentsQuery,
  type Appointment,
  type CaseRow,
  type Lawyer,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { formatDate, formatUGX, formatUGXCompact } from "@/lib/format";
import { toast } from "@/lib/toast";

type Tab = "pipeline" | "schedule" | "clients" | "analytics" | "profile" | "compliance" | "guides";
const STATUS_OPTIONS = ["open", "hearing", "closed"].map((s) => ({
  value: s,
  label: s[0].toUpperCase() + s.slice(1),
}));

function Pipeline({ cases, loading }: { cases: CaseRow[]; loading: boolean }) {
  const { colors } = useTheme();
  const { user } = useSession();
  const qc = useQueryClient();
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("cases").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cases", user?.id] });
  };
  if (loading) return <LoadingRows rows={3} />;
  if (!cases.length)
    return (
      <EmptyState
        icon={<Briefcase size={22} color={colors.brass} />}
        title="No matters yet"
        description="Cases assigned to you will appear here."
      />
    );
  return (
    <View style={{ gap: 12 }}>
      {cases.map((c) => (
        <View key={c.id} style={{ gap: 6 }}>
          <MatterItem matter={c} />
          <View style={{ paddingHorizontal: 4 }}>
            <SelectField
              label="Move to"
              value={c.status}
              onChange={(s) => void setStatus(c.id, s)}
              options={STATUS_OPTIONS}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function Schedule({ appointments, loading }: { appointments: Appointment[]; loading: boolean }) {
  const { colors } = useTheme();
  const { user } = useSession();
  const qc = useQueryClient();
  const now = useNow();
  const upcoming = appointments.filter((a) => new Date(a.scheduled_at).getTime() > now - 3_600_000);
  const setStatus = async (id: string, status: "confirmed" | "cancelled") => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "confirmed" ? "Appointment confirmed" : "Appointment declined");
    qc.invalidateQueries({ queryKey: ["appointments", user?.id] });
  };
  if (loading) return <LoadingRows rows={3} />;
  if (!upcoming.length)
    return (
      <EmptyState
        icon={<CalendarDays size={22} color={colors.brass} />}
        title="Nothing scheduled"
        description="Consultation requests from clients land here."
      />
    );
  return (
    <View style={{ gap: 12 }}>
      {upcoming.map((a) => (
        <View key={a.id} style={{ gap: 8 }}>
          <AppointmentItem appointment={a} perspective="lawyer" />
          {a.status === "pending" ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                title="Confirm"
                size="sm"
                onPress={() => void setStatus(a.id, "confirmed")}
                style={{ flex: 1 }}
              />
              <Button
                title="Decline"
                size="sm"
                variant="outline"
                onPress={() => void setStatus(a.id, "cancelled")}
                style={{ flex: 1 }}
              />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function Clients({ cases }: { cases: CaseRow[] }) {
  const { colors } = useTheme();
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
  if (!clientIds.length)
    return (
      <EmptyState
        icon={<Users size={22} color={colors.brass} />}
        title="No clients yet"
        description="Clients from your matters will appear here."
      />
    );
  if (clients.isLoading) return <LoadingRows rows={3} />;
  return (
    <View style={{ gap: 10 }}>
      {(clients.data ?? []).map((c) => (
        <Card key={c.id}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={c.full_name} uri={c.avatar_url} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{c.full_name || "Unnamed client"}</Text>
              <Text variant="small" tone="muted">
                {c.email} · {cases.filter((m) => m.client_id === c.id).length} matter(s)
              </Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

function ProfileEditor() {
  const { user } = useSession();
  const profile = useQuery(myLawyerProfileQuery(user?.id));
  if (profile.isLoading) return <LoadingRows rows={3} />;
  if (!profile.data) {
    return (
      <EmptyState
        title="No advocate profile on file"
        description="Ask an administrator to set up your advocate profile first."
      />
    );
  }
  // Keyed so the form re-initialises only when a different profile loads, not on every refetch.
  return <ProfileForm key={profile.data.id} lawyer={profile.data} />;
}

function ProfileForm({ lawyer }: { lawyer: Lawyer }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    headline: lawyer.headline ?? "",
    bio: lawyer.bio ?? "",
    firm: lawyer.firm ?? "",
    city: lawyer.city ?? "",
    consultation_fee: lawyer.consultation_fee != null ? String(lawyer.consultation_fee) : "",
    hourly_rate: lawyer.hourly_rate != null ? String(lawyer.hourly_rate) : "",
    practice_areas: (lawyer.practice_areas ?? []).join(", "),
    languages: (lawyer.languages ?? []).join(", "),
    accepting_clients: lawyer.accepting_clients,
  }));
  const [saving, setSaving] = useState(false);

  const list = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  const save = async () => {
    setSaving(true);
    // Verification, rating and licence fields are admin-controlled (enforced by a DB trigger).
    const { error } = await supabase
      .from("lawyers")
      .update({
        headline: form.headline.trim() || null,
        bio: form.bio.trim() || null,
        firm: form.firm.trim() || null,
        city: form.city.trim() || null,
        consultation_fee: form.consultation_fee ? Number(form.consultation_fee) : null,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
        practice_areas: list(form.practice_areas),
        languages: list(form.languages),
        accepting_clients: form.accepting_clients,
      })
      .eq("id", lawyer.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["my-lawyer-profile", user?.id] });
    qc.invalidateQueries({ queryKey: ["lawyers"] });
  };
  const set = (k: keyof typeof form) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="h3" style={{ flex: 1 }}>
            Public profile
          </Text>
          <StatusPill value={lawyer.verified ? "verified" : "pending"} />
        </View>
        <SwitchField
          label="Accepting new clients"
          value={form.accepting_clients}
          onChange={set("accepting_clients")}
        />
        <Input
          label="Headline"
          value={form.headline}
          onChangeText={set("headline")}
          placeholder="e.g. Land & property advocate"
        />
        <Input label="About you" value={form.bio} onChangeText={set("bio")} multiline />
        <Input label="Firm" value={form.firm} onChangeText={set("firm")} />
        <Input label="Town / city" value={form.city} onChangeText={set("city")} />
        <Input
          label="Consultation fee (UGX)"
          value={form.consultation_fee}
          onChangeText={set("consultation_fee")}
          keyboardType="number-pad"
        />
        <Input
          label="Hourly rate (UGX)"
          value={form.hourly_rate}
          onChangeText={set("hourly_rate")}
          keyboardType="number-pad"
        />
        <Input
          label="Practice areas"
          value={form.practice_areas}
          onChangeText={set("practice_areas")}
          hint="Separate with commas"
        />
        <Input
          label="Languages"
          value={form.languages}
          onChangeText={set("languages")}
          hint="Separate with commas"
        />
        <Button title="Save profile" loading={saving} onPress={() => void save()} fullWidth />
      </View>
    </Card>
  );
}

function Compliance() {
  const { colors } = useTheme();
  const { user } = useSession();
  const qc = useQueryClient();
  const profile = useQuery(myLawyerProfileQuery(user?.id));
  const cpd = useQuery(lawyerCpdRecordsQuery(profile.data?.id));
  // Server value unless the advocate just picked a new date (shown immediately while saving).
  const [pickedExpiry, setExpiry] = useState<Date | null>(null);
  const storedExpiry = profile.data?.bar_license_expires_at;
  const expiry = pickedExpiry ?? (storedExpiry ? new Date(storedExpiry) : null);
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("");
  const [done, setDone] = useState<Date | null>(null);

  if (profile.isLoading) return <LoadingRows rows={2} />;
  if (!profile.data)
    return (
      <EmptyState
        icon={<ShieldCheck size={22} color={colors.brass} />}
        title="No advocate profile on file"
      />
    );
  const lawyerId = profile.data.id;
  const total = (cpd.data ?? []).reduce((s, r) => s + Number(r.hours), 0);

  const saveExpiry = async (d: Date) => {
    setExpiry(d);
    const { error } = await supabase
      .from("lawyers")
      .update({ bar_license_expires_at: d.toISOString().slice(0, 10) })
      .eq("id", lawyerId);
    if (error) return toast.error(error.message);
    toast.success("Licence expiry updated");
    qc.invalidateQueries({ queryKey: ["my-lawyer-profile", user?.id] });
  };
  const addCpd = async () => {
    const h = Number(hours);
    if (!title.trim() || !done || !(h > 0)) return;
    const { error } = await supabase.from("lawyer_cpd_records").insert({
      lawyer_id: lawyerId,
      title: title.trim(),
      hours: h,
      completed_on: done.toISOString().slice(0, 10),
    });
    if (error) return toast.error(error.message);
    setTitle("");
    setHours("");
    setDone(null);
    toast.success("CPD entry logged");
    qc.invalidateQueries({ queryKey: ["lawyer-cpd-records", lawyerId] });
  };

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="h3" style={{ flex: 1 }}>
            Practising certificate
          </Text>
          <StatusPill value={profile.data.license_status} />
        </View>
        <Text variant="small" tone="muted" style={{ marginVertical: 8 }}>
          Keep your expiry current — we’ll remind you before it lapses.
        </Text>
        <DateTimeField
          label="Expiry date"
          mode="date"
          value={expiry}
          onChange={(d) => void saveExpiry(d)}
        />
      </Card>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <GraduationCap size={18} color={colors.brass} />
          <Text variant="h3" style={{ flex: 1 }}>
            Continuing education
          </Text>
          <Text variant="small" tone="muted">
            {total} h
          </Text>
        </View>
        <View style={{ gap: 12, marginTop: 12 }}>
          <Input label="Activity" value={title} onChangeText={setTitle} placeholder="CLE seminar" />
          <Input label="Hours" value={hours} onChangeText={setHours} keyboardType="decimal-pad" />
          <DateTimeField label="Completed on" mode="date" value={done} onChange={setDone} />
          <Button
            title="Log CPD"
            size="sm"
            variant="outline"
            onPress={() => void addCpd()}
            disabled={!title.trim() || !hours || !done}
            style={{ alignSelf: "flex-start" }}
          />
        </View>
      </Card>
      {(cpd.data ?? []).map((r) => (
        <Card key={r.id}>
          <Text variant="bodyStrong">{r.title}</Text>
          <Text variant="small" tone="muted">
            {Number(r.hours)} h · {formatDate(r.completed_on)}
          </Text>
        </Card>
      ))}
    </View>
  );
}

export function PracticeHome() {
  const { colors } = useTheme();
  const { user } = useSession();
  const cases = useQuery(myCasesQuery(user?.id));
  const appts = useQuery(appointmentsQuery(user?.id));
  const docs = useQuery(documentsQuery(user?.id));
  const payments = useQuery(paymentsQuery);
  const [tab, setTab] = useState<Tab>("pipeline");
  const rows = cases.data ?? [];
  // RLS also returns payments this advocate made as a client; only fees paid to them count.
  const fees = useMemo(
    () => (payments.data ?? []).filter((p) => p.lawyer_id === user?.id && p.status === "completed"),
    [payments.data, user?.id],
  );
  const earned = fees.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <Screen
      edges={["top", "left", "right"]}
      refreshing={cases.isRefetching}
      onRefresh={() => {
        void cases.refetch();
        void appts.refetch();
        void docs.refetch();
        void payments.refetch();
      }}
    >
      <PageHeading
        eyebrow="Advocate workspace"
        title="Practice"
        description="Your pipeline, clients, calendar and public profile."
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <StatTile
          label="Open matters"
          value={rows.filter((c) => c.status !== "closed").length}
          icon={<Briefcase size={14} color={colors.brass} />}
        />
        <StatTile
          label="Clients"
          value={new Set(rows.map((c) => c.client_id)).size}
          icon={<Users size={14} color={colors.brass} />}
        />
        <StatTile
          label="Documents"
          value={(docs.data ?? []).length}
          icon={<FileText size={14} color={colors.brass} />}
        />
        <StatTile
          label="Fees received"
          value={formatUGXCompact(earned)}
          hint={formatUGX(earned)}
          icon={<CreditCard size={14} color={colors.brass} />}
        />
      </View>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "pipeline", label: "Pipeline" },
          { value: "schedule", label: "Schedule" },
          { value: "clients", label: "Clients" },
          { value: "analytics", label: "Analytics" },
          { value: "profile", label: "Profile" },
          { value: "compliance", label: "Compliance" },
          { value: "guides", label: "Guides" },
        ]}
      />
      {cases.isError ? (
        <ErrorState message={(cases.error as Error).message} onRetry={() => void cases.refetch()} />
      ) : null}
      {tab === "pipeline" ? <Pipeline cases={rows} loading={cases.isLoading} /> : null}
      {tab === "schedule" ? (
        <Schedule appointments={appts.data ?? []} loading={appts.isLoading} />
      ) : null}
      {tab === "clients" ? <Clients cases={rows} /> : null}
      {tab === "analytics" ? (
        <PracticeAnalytics
          cases={rows}
          fees={fees}
          loading={cases.isLoading || payments.isLoading}
        />
      ) : null}
      {tab === "profile" ? <ProfileEditor /> : null}
      {tab === "compliance" ? <Compliance /> : null}
      {tab === "guides" ? <ContentManager config={CONTENT.advice} /> : null}
    </Screen>
  );
}
