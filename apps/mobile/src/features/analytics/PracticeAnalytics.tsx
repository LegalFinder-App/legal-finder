import { useMemo } from "react";
import { View } from "react-native";
import { Percent, Timer } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { LoadingRows, StatTile, Text } from "@/components/ui";
import { BarList, ChartCard, ChartGrid, SeriesChart } from "@/components/charts";
import { countBy, monthlySeries } from "@/lib/analytics";
import { formatUGX } from "@/lib/format";
import type { CaseRow, PaymentRow } from "@/lib/queries";

const DAY = 86_400_000;

/**
 * An advocate's practice analytics — the same figures as the web's PracticeAnalytics, worked out
 * from the rows the Practice screen already has. `fees` are the completed payments made to this
 * advocate.
 */
export function PracticeAnalytics({
  cases,
  fees,
  loading,
}: {
  cases: CaseRow[];
  fees: PaymentRow[];
  loading: boolean;
}) {
  const { colors } = useTheme();

  const closed = useMemo(() => cases.filter((c) => c.status === "closed"), [cases]);
  const resolutionRate = cases.length ? Math.round((closed.length / cases.length) * 100) : 0;

  const averageDays = useMemo(() => {
    if (!closed.length) return null;
    const total = closed.reduce((sum, c) => {
      const days = (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / DAY;
      return sum + Math.max(0, days);
    }, 0);
    return Math.round(total / closed.length);
  }, [closed]);

  const outcomes = useMemo(() => countBy(closed, (c) => c.outcome ?? "not recorded"), [closed]);
  const revenue = useMemo(
    () =>
      monthlySeries(
        fees,
        (p) => p.created_at,
        (p) => Number(p.amount),
      ),
    [fees],
  );

  if (loading) return <LoadingRows rows={3} height={120} />;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <StatTile
          label="Resolution rate"
          value={`${resolutionRate}%`}
          hint={`${closed.length} of ${cases.length} matters closed`}
          icon={<Percent size={14} color={colors.brass} />}
        />
        <StatTile
          label="Days to close"
          value={averageDays ?? "—"}
          hint={closed.length ? "on average" : "No closed matters yet"}
          icon={<Timer size={14} color={colors.brass} />}
        />
      </View>

      <ChartGrid>
        <ChartCard eyebrow="Revenue" title="Completed payments, last 6 months">
          <SeriesChart
            kind="line"
            data={revenue}
            color={colors.brass}
            formatValue={formatUGX}
            emptyText="No completed payments in the last 6 months."
          />
        </ChartCard>
        <ChartCard eyebrow="Outcomes" title="Closed cases by outcome">
          {outcomes.length === 0 ? (
            <Text variant="small" tone="muted" align="center" style={{ paddingVertical: 28 }}>
              No closed matters yet.
            </Text>
          ) : (
            <BarList
              data={outcomes}
              color={colors.primary}
              formatValue={(n) => `${n} ${n === 1 ? "case" : "cases"}`}
            />
          )}
        </ChartCard>
      </ChartGrid>
    </View>
  );
}
