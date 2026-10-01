import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/theme/ThemeProvider";
import { ErrorState, LoadingRows, Stars, Text } from "@/components/ui";
import { BarList, ChartCard, ChartGrid, SeriesChart } from "@/components/charts";
import { countBy, dailySeries, monthlySeries } from "@/lib/analytics";
import { formatUGX } from "@/lib/format";
import {
  allCasesQuery,
  allProfilesQuery,
  auditLogsQuery,
  lawyersQuery,
  paymentsQuery,
} from "@/lib/queries";
import { useSession } from "@/lib/session";

// auditLogsQuery fetches the latest 100 events — say so when the chart is working from a sample.
const AUDIT_LIMIT = 100;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The charts of the web's admin overview: growth, caseload, revenue, activity, top advocates. */
export function AdminAnalytics() {
  const { colors } = useTheme();
  const { user } = useSession();
  const profiles = useQuery(allProfilesQuery);
  const lawyers = useQuery(lawyersQuery());
  const cases = useQuery(allCasesQuery);
  const logs = useQuery(auditLogsQuery(user?.id));
  const payments = useQuery(paymentsQuery);

  const completed = useMemo(
    () => (payments.data ?? []).filter((p) => p.status === "completed"),
    [payments.data],
  );
  const signups = useMemo(
    () =>
      monthlySeries(
        profiles.data ?? [],
        (p) => p.created_at,
        () => 1,
      ),
    [profiles.data],
  );
  const caseStatus = useMemo(
    () => countBy(cases.data ?? [], (c) => c.status || "unknown"),
    [cases.data],
  );
  const revenue = useMemo(
    () =>
      monthlySeries(
        completed,
        (p) => p.created_at,
        (p) => Number(p.amount),
      ),
    [completed],
  );
  const activity = useMemo(
    () =>
      dailySeries(
        logs.data ?? [],
        (l) => l.created_at,
        () => 1,
      ),
    [logs.data],
  );

  const topAdvocates = useMemo(() => {
    const caseload = new Map<string, number>();
    for (const c of cases.data ?? []) {
      if (c.lawyer_id) caseload.set(c.lawyer_id, (caseload.get(c.lawyer_id) ?? 0) + 1);
    }
    const earned = new Map<string, number>();
    for (const p of completed) {
      if (p.lawyer_id) earned.set(p.lawyer_id, (earned.get(p.lawyer_id) ?? 0) + Number(p.amount));
    }
    return (lawyers.data ?? [])
      .filter((lawyer) => lawyer.user_id)
      .map((lawyer) => ({
        id: lawyer.id,
        name: lawyer.full_name,
        rating: Number(lawyer.rating ?? 0),
        reviews: lawyer.review_count ?? 0,
        cases: caseload.get(lawyer.user_id!) ?? 0,
        revenue: earned.get(lawyer.user_id!) ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.rating - a.rating)
      .slice(0, 10);
  }, [lawyers.data, cases.data, completed]);

  const queries = [profiles, lawyers, cases, logs, payments];
  if (queries.some((q) => q.isLoading)) return <LoadingRows rows={3} height={220} />;
  const failed = queries.find((q) => q.isError);
  if (failed) {
    return (
      <ErrorState
        message={(failed.error as Error).message}
        onRetry={() => {
          for (const q of queries) if (q.isError) void q.refetch();
        }}
      />
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <ChartGrid>
        <ChartCard eyebrow="Growth" title="Signups, last 6 months">
          <SeriesChart
            kind="line"
            data={signups}
            color={colors.brass}
            formatValue={(n) => plural(n, "signup", "signups")}
            emptyText="No signups in the last 6 months."
          />
        </ChartCard>
        <ChartCard eyebrow="Caseload" title="Cases by status">
          {caseStatus.length === 0 ? (
            <Text variant="small" tone="muted" align="center" style={styles.none}>
              No cases recorded yet.
            </Text>
          ) : (
            <BarList
              data={caseStatus}
              color={colors.primary}
              formatValue={(n) => plural(n, "case", "cases")}
            />
          )}
        </ChartCard>
        <ChartCard eyebrow="Revenue" title="Completed payments, last 6 months">
          <SeriesChart
            kind="line"
            data={revenue}
            color={colors.brass}
            formatValue={formatUGX}
            emptyText="No completed payments in the last 6 months."
          />
        </ChartCard>
        <ChartCard
          eyebrow="Activity"
          title="Audit events, last 14 days"
          note={
            (logs.data?.length ?? 0) >= AUDIT_LIMIT
              ? `Counted from the ${AUDIT_LIMIT} most recent events.`
              : undefined
          }
        >
          <SeriesChart
            kind="columns"
            data={activity}
            color={colors.brass}
            formatValue={(n) => plural(n, "event", "events")}
            emptyText="No audit events in the last 14 days."
          />
        </ChartCard>
      </ChartGrid>

      <ChartCard eyebrow="Performance" title="Top advocates">
        {topAdvocates.length === 0 ? (
          <Text variant="small" tone="muted" align="center" style={styles.none}>
            No advocate activity recorded yet.
          </Text>
        ) : (
          topAdvocates.map((row, i) => (
            <View
              key={row.id}
              style={[
                styles.advocate,
                i > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <Text variant="mono" tone="muted" style={styles.rank}>
                {i + 1}
              </Text>
              <View style={styles.advocateText}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {row.name}
                </Text>
                <View style={styles.meta}>
                  <Stars value={row.rating} size={12} />
                  <Text variant="small" tone="muted">
                    ({row.reviews}) · {plural(row.cases, "case", "cases")}
                  </Text>
                </View>
              </View>
              <Text variant="bodyStrong">{formatUGX(row.revenue)}</Text>
            </View>
          ))
        )}
      </ChartCard>
    </View>
  );
}

const styles = StyleSheet.create({
  none: { paddingVertical: 28 },
  advocate: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  rank: { width: 20 },
  advocateText: { flex: 1 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
});
