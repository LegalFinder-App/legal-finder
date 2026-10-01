import { useMemo, useState } from "react";
import { View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Wallet } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Button,
  Card,
  ChipRow,
  EmptyState,
  ErrorState,
  LoadingRows,
  StatusPill,
  Text,
  type StatusTone,
} from "@/components/ui";
import { api } from "@/lib/api";
import { lawyersQuery, paymentsQuery, type PaymentRow } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import { errorMessage, toast } from "@/lib/toast";

// A payout that is "completed" is the good outcome here, unlike StatusPill's default grey.
const PAYOUT_TONE: Record<string, StatusTone> = {
  completed: "success",
  processing: "warning",
  pending: "warning",
  failed: "destructive",
};

type Filter = "due" | "processing" | "paid" | "unpaid";

// Every advocate-linked payment starts with payout_status 'pending', paid or not, so the client's
// own payment status decides whether a payout is actually owed.
function bucket(payment: PaymentRow): Filter {
  if (payment.payout_status === "completed") return "paid";
  if (payment.payout_status === "processing") return "processing";
  return payment.status === "completed" ? "due" : "unpaid";
}

const EMPTY: Record<Filter, { title: string; description: string }> = {
  due: {
    title: "Nothing waiting to be paid out",
    description: "Fees that are paid by the client but not yet sent to the advocate appear here.",
  },
  processing: {
    title: "No payouts in progress",
    description: "Transfers Flutterwave is still confirming appear here.",
  },
  paid: {
    title: "No payouts yet",
    description: "Payouts appear here once a client books and pays for a consultation.",
  },
  unpaid: {
    title: "No unpaid consultations",
    description: "Consultation fees the client hasn’t paid yet appear here.",
  },
};

function money(payment: PaymentRow) {
  const amount = Number(payment.amount).toLocaleString("en-UG", { maximumFractionDigits: 0 });
  return `${payment.currency} ${amount}`;
}

/** The app's counterpart of the web's admin Payouts panel. */
export function PayoutsPanel() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const payments = useQuery(paymentsQuery);
  const lawyers = useQuery(lawyersQuery());
  const [filter, setFilter] = useState<Filter>("due");
  const [retrying, setRetrying] = useState<string | null>(null);

  const groups = useMemo(() => {
    const out: Record<Filter, PaymentRow[]> = { due: [], processing: [], paid: [], unpaid: [] };
    for (const payment of payments.data ?? []) {
      if (payment.payout_status !== "not_applicable") out[bucket(payment)].push(payment);
    }
    return out;
  }, [payments.data]);

  const lawyerName = (lawyerId: string | null) =>
    lawyers.data?.find((l) => l.user_id === lawyerId)?.full_name ?? "Unknown advocate";

  const retry = async (paymentId: string) => {
    setRetrying(paymentId);
    try {
      const result = await api.retryPayout(paymentId);
      await qc.invalidateQueries({ queryKey: ["payments"] });
      if (result.payoutStatus === "failed") {
        toast.error("The payout failed again", {
          description: result.failureReason ?? undefined,
        });
      } else if (result.payoutStatus === "pending") {
        toast.message("Still waiting", {
          description: "The advocate hasn’t added payout details yet.",
        });
      } else if (result.payoutStatus === "completed") {
        toast.success("Already paid out");
      } else {
        toast.success("Payout sent", {
          description: "Flutterwave confirms the transfer shortly.",
        });
      }
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't retry the payout"));
    } finally {
      setRetrying(null);
    }
  };

  if (payments.isLoading) return <LoadingRows rows={4} />;
  if (payments.isError) {
    return (
      <ErrorState
        message={(payments.error as Error).message}
        onRetry={() => void payments.refetch()}
      />
    );
  }

  const rows = groups[filter];

  return (
    <View style={{ gap: 12 }}>
      <Text variant="small" tone="muted">
        Consultation fees are paid out to the advocate automatically via Flutterwave as soon as a
        client’s payment clears. Retry a payout that is stuck or has failed here.
      </Text>
      <ChipRow
        value={filter}
        onChange={setFilter}
        options={[
          { value: "due", label: `To pay out (${groups.due.length})` },
          { value: "processing", label: `In progress (${groups.processing.length})` },
          { value: "paid", label: `Paid out (${groups.paid.length})` },
          { value: "unpaid", label: `Client unpaid (${groups.unpaid.length})` },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Wallet size={22} color={colors.brass} />}
          title={EMPTY[filter].title}
          description={EMPTY[filter].description}
        />
      ) : (
        rows.map((payment) => (
          <Card key={payment.id}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{lawyerName(payment.lawyer_id)}</Text>
                <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
                  {money(payment)} · {formatDateTime(payment.created_at)}
                </Text>
              </View>
              {filter === "unpaid" ? (
                <StatusPill value={payment.status} />
              ) : (
                <StatusPill
                  value={payment.payout_status}
                  tone={PAYOUT_TONE[payment.payout_status]}
                />
              )}
            </View>
            {payment.payout_failure_reason ? (
              <Text variant="small" tone="destructive" style={{ marginTop: 8 }}>
                {payment.payout_failure_reason}
              </Text>
            ) : null}
            {filter === "unpaid" ? (
              <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
                The client hasn’t paid this fee, so there is nothing to pay out yet.
              </Text>
            ) : null}
            {filter === "due" && !payment.payout_failure_reason ? (
              <Text variant="small" tone="brass" style={{ marginTop: 8 }}>
                Awaiting the advocate’s payout setup
              </Text>
            ) : null}
            {filter === "due" ? (
              <Button
                title="Retry payout"
                variant="outline"
                size="sm"
                loading={retrying === payment.id}
                disabled={retrying !== null}
                icon={<RefreshCw size={14} color={colors.foreground} />}
                onPress={() => void retry(payment.id)}
                style={{ marginTop: 12, alignSelf: "flex-start" }}
              />
            ) : null}
          </Card>
        ))
      )}
    </View>
  );
}
