import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  FileCheck2,
  Flag,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { LoadingRows, Stars } from "@/components/common/bits";
import { MetricTile, WorkspacePanel } from "@/components/app/shell/workspace-chrome";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import {
  allCasesQuery,
  allPaymentsQuery,
  allProfilesQuery,
  auditLogsQuery,
  lawyersQuery,
} from "@/lib/queries";
import { useSession } from "@/lib/session";
import { dailySeries, monthlySeries } from "@/lib/analytics-series";

const signupsConfig: ChartConfig = { count: { label: "New signups", color: "var(--brass)" } };
const casesConfig: ChartConfig = { count: { label: "Cases", color: "var(--primary)" } };
const auditConfig: ChartConfig = { count: { label: "Audit events", color: "var(--brass)" } };
const revenueConfig: ChartConfig = { amount: { label: "Revenue", color: "var(--brass)" } };

const QUICK_LINKS = [
  { to: "/admin/applications", label: "Applications", icon: FileCheck2 },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/payouts", label: "Payouts", icon: Wallet },
] as const;

export function AdminOverview() {
  const { user } = useSession();
  const profiles = useQuery(allProfilesQuery);
  const lawyers = useQuery(lawyersQuery());
  const cases = useQuery(allCasesQuery);
  const auditLogs = useQuery(auditLogsQuery(user?.id));
  const payments = useQuery(allPaymentsQuery);

  const signupSeries = useMemo(
    () =>
      monthlySeries(
        profiles.data ?? [],
        (profile) => profile.created_at,
        () => 1,
      ).map(({ label, value }) => ({ label, count: value })),
    [profiles.data],
  );

  const caseStatusSeries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of cases.data ?? []) {
      const status = row.status || "unknown";
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }, [cases.data]);

  const auditSeries = useMemo(
    () =>
      dailySeries(
        auditLogs.data ?? [],
        (entry) => entry.created_at,
        () => 1,
      ).map(({ label, value }) => ({ label, count: value })),
    [auditLogs.data],
  );

  const revenueSeries = useMemo(
    () =>
      monthlySeries(
        (payments.data ?? []).filter((payment) => payment.status === "completed"),
        (payment) => payment.created_at,
        (payment) => Number(payment.amount),
      ).map(({ label, value }) => ({ label, amount: Math.round(value) })),
    [payments.data],
  );

  const advocatePerformance = useMemo(() => {
    const caseCounts = new Map<string, number>();
    for (const c of cases.data ?? []) {
      if (!c.lawyer_id) continue;
      caseCounts.set(c.lawyer_id, (caseCounts.get(c.lawyer_id) ?? 0) + 1);
    }
    const revenueByLawyer = new Map<string, number>();
    for (const payment of payments.data ?? []) {
      if (payment.status !== "completed" || !payment.lawyer_id) continue;
      revenueByLawyer.set(
        payment.lawyer_id,
        (revenueByLawyer.get(payment.lawyer_id) ?? 0) + Number(payment.amount),
      );
    }
    return (lawyers.data ?? [])
      .filter((lawyer) => lawyer.user_id)
      .map((lawyer) => ({
        id: lawyer.id,
        name: lawyer.full_name,
        rating: lawyer.rating,
        reviewCount: lawyer.review_count,
        caseload: caseCounts.get(lawyer.user_id!) ?? 0,
        revenue: revenueByLawyer.get(lawyer.user_id!) ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.rating - a.rating)
      .slice(0, 10);
  }, [lawyers.data, cases.data, payments.data]);

  const totalRevenue = useMemo(
    () =>
      (payments.data ?? [])
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + Number(p.amount), 0),
    [payments.data],
  );

  const isLoading =
    profiles.isLoading ||
    lawyers.isLoading ||
    cases.isLoading ||
    auditLogs.isLoading ||
    payments.isLoading;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile
          label="Registered users"
          value={profiles.data?.length ?? 0}
          icon={<Users className="h-4 w-4" />}
        />
        <MetricTile
          label="Verified advocates"
          value={lawyers.data?.filter((lawyer) => lawyer.verified).length ?? 0}
          hint={`${lawyers.data?.length ?? 0} listed`}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <MetricTile
          label="Open matters"
          value={cases.data?.filter((c) => c.status === "open").length ?? 0}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <MetricTile
          label="Audit events"
          value={auditLogs.data?.length ?? 0}
          hint="Latest 100"
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricTile
          label="Revenue"
          value={totalRevenue.toLocaleString()}
          hint="Completed · all-time"
          icon={<Wallet className="h-4 w-4" />}
          className="sm:col-span-2 xl:col-span-1"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map((link) => (
          <Button key={link.to} asChild variant="outline" size="sm" className="rounded-xl">
            <Link to={link.to}>
              <link.icon className="h-3.5 w-3.5 text-brass" />
              {link.label}
              <ArrowUpRight className="h-3.5 w-3.5 opacity-50" />
            </Link>
          </Button>
        ))}
      </div>

      {isLoading ? (
        <LoadingRows rows={3} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <WorkspacePanel eyebrow="Growth" title="Signups" description="New accounts, last 6 months">
            <ChartContainer config={signupsConfig} className="aspect-auto h-52 w-full">
              <LineChart data={signupSeries} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={2.25}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </WorkspacePanel>

          <WorkspacePanel eyebrow="Caseload" title="Cases by status">
            {caseStatusSeries.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No cases recorded yet.</p>
            ) : (
              <ChartContainer config={casesConfig} className="aspect-auto h-52 w-full">
                <BarChart data={caseStatusSeries} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 2, 2]} />
                </BarChart>
              </ChartContainer>
            )}
          </WorkspacePanel>

          <WorkspacePanel
            eyebrow="Revenue"
            title="Completed payments"
            description="Last 6 months"
          >
            <ChartContainer config={revenueConfig} className="aspect-auto h-52 w-full">
              <LineChart data={revenueSeries} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-amount)"
                  strokeWidth={2.25}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </WorkspacePanel>

          <WorkspacePanel eyebrow="Activity" title="Audit events" description="Last 14 days">
            <ChartContainer config={auditConfig} className="aspect-auto h-52 w-full">
              <BarChart data={auditSeries} margin={{ left: 0, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={1}
                />
                <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 2, 2]} />
              </BarChart>
            </ChartContainer>
          </WorkspacePanel>

          <WorkspacePanel
            eyebrow="Performance"
            title="Top advocates"
            description="By completed revenue and rating"
            className="lg:col-span-2"
          >
            {advocatePerformance.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No advocate activity recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Advocate</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Cases</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advocatePerformance.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Stars value={row.rating} />
                            <span className="text-xs text-muted-foreground">({row.reviewCount})</span>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">{row.caseload}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {row.revenue.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </WorkspacePanel>
        </div>
      )}
    </div>
  );
}
