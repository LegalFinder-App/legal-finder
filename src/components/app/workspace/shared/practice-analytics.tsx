import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { StatCard, LoadingRows, SectionHeading } from "@/components/common/bits";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { allPaymentsQuery, myCasesQuery } from "@/lib/queries";

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short" });
}

function buildLastNMonths(n: number) {
  const labels: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    labels.push(monthLabel(date.toISOString()));
  }
  return labels;
}

const revenueConfig: ChartConfig = { amount: { label: "Revenue", color: "var(--brass)" } };
const outcomeConfig: ChartConfig = { count: { label: "Cases", color: "var(--primary)" } };

export function PracticeAnalytics({ userId }: { userId: string | undefined }) {
  const cases = useQuery(myCasesQuery(userId));
  const payments = useQuery(allPaymentsQuery);

  const closedCases = useMemo(
    () => (cases.data ?? []).filter((c) => c.status === "closed"),
    [cases.data],
  );

  const resolutionRate =
    (cases.data?.length ?? 0) > 0
      ? Math.round((closedCases.length / (cases.data?.length ?? 1)) * 100)
      : 0;

  const avgDaysToClose = useMemo(() => {
    const withDuration = closedCases.filter((c) => c.created_at && c.updated_at);
    if (withDuration.length === 0) return null;
    const totalDays = withDuration.reduce((sum, c) => {
      const days =
        (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86_400_000;
      return sum + Math.max(0, days);
    }, 0);
    return Math.round(totalDays / withDuration.length);
  }, [closedCases]);

  const outcomeSeries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of closedCases) {
      const label = c.outcome ?? "not recorded";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }, [closedCases]);

  const revenueSeries = useMemo(() => {
    const buckets = buildLastNMonths(6);
    const totals = new Map(buckets.map((label) => [label, 0]));
    for (const payment of payments.data ?? []) {
      if (payment.status !== "completed") continue;
      const label = monthLabel(payment.created_at);
      if (totals.has(label)) totals.set(label, (totals.get(label) ?? 0) + Number(payment.amount));
    }
    return buckets.map((label) => ({ label, amount: Math.round(totals.get(label) ?? 0) }));
  }, [payments.data]);

  const totalRevenue = useMemo(
    () =>
      (payments.data ?? [])
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + Number(p.amount), 0),
    [payments.data],
  );

  if (cases.isLoading || payments.isLoading) return <LoadingRows rows={3} />;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Resolution rate" value={`${resolutionRate}%`} hint="Closed / total" />
        <StatCard
          label="Avg. days to close"
          value={avgDaysToClose ?? "—"}
          hint={
            closedCases.length ? `${closedCases.length} closed matter(s)` : "No closed matters yet"
          }
        />
        <StatCard
          label="Revenue (completed)"
          value={totalRevenue.toLocaleString()}
          hint="All-time"
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5 shadow-plate">
          <SectionHeading eyebrow="Revenue" title="Completed payments, last 6 months" />
          <ChartContainer config={revenueConfig} className="mt-4 aspect-auto h-56 w-full">
            <LineChart data={revenueSeries} margin={{ left: 0, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="var(--color-amount)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-plate">
          <SectionHeading eyebrow="Outcomes" title="Closed cases by outcome" />
          {outcomeSeries.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">No closed matters yet.</p>
          ) : (
            <ChartContainer config={outcomeConfig} className="mt-4 aspect-auto h-56 w-full">
              <BarChart data={outcomeSeries} margin={{ left: 0, right: 12 }}>
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
      </div>
    </div>
  );
}
