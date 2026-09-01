import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Activity, Briefcase, ShieldCheck, Users } from "lucide-react";
import { StatCard, LoadingRows, SectionHeading } from "@/components/common/bits";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { allCasesQuery, allProfilesQuery, auditLogsQuery, lawyersQuery } from "@/lib/queries";
import { useSession } from "@/lib/session";

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short" });
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildLastN(n: number, unit: "month" | "day") {
  const labels: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    if (unit === "month") date.setMonth(date.getMonth() - i);
    else date.setDate(date.getDate() - i);
    labels.push(unit === "month" ? monthLabel(date.toISOString()) : dayLabel(date.toISOString()));
  }
  return labels;
}

const signupsConfig: ChartConfig = { count: { label: "New signups", color: "var(--brass)" } };
const casesConfig: ChartConfig = { count: { label: "Cases", color: "var(--primary)" } };
const auditConfig: ChartConfig = { count: { label: "Audit events", color: "var(--brass)" } };

export function AdminOverview() {
  const { user } = useSession();
  const profiles = useQuery(allProfilesQuery);
  const lawyers = useQuery(lawyersQuery());
  const cases = useQuery(allCasesQuery);
  const auditLogs = useQuery(auditLogsQuery(user?.id));

  const signupSeries = useMemo(() => {
    const buckets = buildLastN(6, "month");
    const counts = new Map(buckets.map((label) => [label, 0]));
    for (const profile of profiles.data ?? []) {
      const label = monthLabel(profile.created_at);
      if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return buckets.map((label) => ({ label, count: counts.get(label) ?? 0 }));
  }, [profiles.data]);

  const caseStatusSeries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of cases.data ?? []) {
      const status = row.status || "unknown";
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }, [cases.data]);

  const auditSeries = useMemo(() => {
    const buckets = buildLastN(14, "day");
    const counts = new Map(buckets.map((label) => [label, 0]));
    for (const entry of auditLogs.data ?? []) {
      const label = dayLabel(entry.created_at);
      if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return buckets.map((label) => ({ label, count: counts.get(label) ?? 0 }));
  }, [auditLogs.data]);

  const isLoading =
    profiles.isLoading || lawyers.isLoading || cases.isLoading || auditLogs.isLoading;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Registered users"
          value={profiles.data?.length ?? 0}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Verified advocates"
          value={lawyers.data?.filter((lawyer) => lawyer.verified).length ?? 0}
          hint={`${lawyers.data?.length ?? 0} total`}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Open matters"
          value={cases.data?.filter((c) => c.status === "open").length ?? 0}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard
          label="Audit events (100 latest)"
          value={auditLogs.data?.length ?? 0}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {isLoading ? (
        <div className="mt-10">
          <LoadingRows rows={3} />
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-5 shadow-plate">
            <SectionHeading eyebrow="Growth" title="Signups, last 6 months" />
            <ChartContainer config={signupsConfig} className="mt-4 aspect-auto h-56 w-full">
              <LineChart data={signupSeries} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-plate">
            <SectionHeading eyebrow="Caseload" title="Cases by status" />
            {caseStatusSeries.length === 0 ? (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                No cases recorded yet.
              </p>
            ) : (
              <ChartContainer config={casesConfig} className="mt-4 aspect-auto h-56 w-full">
                <BarChart data={caseStatusSeries} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="capitalize"
                  />
                  <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-plate lg:col-span-2">
            <SectionHeading eyebrow="Activity" title="Audit events, last 14 days" />
            <ChartContainer config={auditConfig} className="mt-4 aspect-auto h-56 w-full">
              <BarChart data={auditSeries} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={1}
                />
                <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </section>
        </div>
      )}
    </div>
  );
}
