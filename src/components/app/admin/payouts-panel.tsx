import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Wallet } from "lucide-react";
import { toast } from "@/lib/toast";
import { EmptyState, LoadingRows, QueryError } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { allPaymentsQuery, lawyersQuery } from "@/lib/queries";

const PAYOUT_TONE: Record<string, string> = {
  completed: "bg-success/15 text-success",
  processing: "bg-warning/20 text-warning-foreground",
  pending: "bg-warning/20 text-warning-foreground",
  failed: "bg-destructive/15 text-destructive",
};

export function PayoutsPanel() {
  const queryClient = useQueryClient();
  const payments = useQuery(allPaymentsQuery);
  const lawyers = useQuery(lawyersQuery());
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const payouts = (payments.data ?? []).filter((p) => p.payout_status !== "not_applicable");
  const lawyerName = (lawyerId: string | null) =>
    lawyers.data?.find((l) => l.user_id === lawyerId)?.full_name ?? "Unknown advocate";

  const retry = async (paymentId: string) => {
    setRetryingId(paymentId);
    try {
      const { retryLawyerPayout } = await import("@/lib/payouts.functions");
      await retryLawyerPayout({ data: { paymentId } });
      await queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payout retried");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to retry payout");
    } finally {
      setRetryingId(null);
    }
  };

  if (payments.isLoading) return <LoadingRows rows={5} />;
  if (payments.isError) {
    return (
      <QueryError
        message={payments.error instanceof Error ? payments.error.message : undefined}
        onRetry={() => payments.refetch()}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Lawyer payouts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultation fees are paid out to the advocate automatically via Flutterwave the instant
            a client's payment clears. Retry a payout that's stuck or failed here.
          </p>
        </div>
        <Wallet className="h-6 w-6 text-brass" />
      </div>

      <div className="mt-6 space-y-3">
        {payouts.length === 0 ? (
          <EmptyState
            title="No payouts yet"
            description="Payouts appear here once a client books and pays for a consultation."
          />
        ) : (
          payouts.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div>
                <p className="font-display text-sm font-semibold">
                  {lawyerName(payment.lawyer_id)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {payment.currency} {Number(payment.amount).toLocaleString()} ·{" "}
                  {new Date(payment.created_at).toLocaleString()}
                </p>
                {payment.payout_failure_reason && (
                  <p className="mt-1 text-xs text-destructive">{payment.payout_failure_reason}</p>
                )}
                {/* Every advocate-linked payment starts with payout 'pending', paid or not. */}
                {payment.status !== "completed" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    The client hasn't paid this fee, so there is nothing to pay out yet.
                  </p>
                ) : (
                  payment.payout_status === "pending" &&
                  !payment.payout_failure_reason && (
                    <p className="mt-1 text-xs text-warning-foreground">
                      Awaiting the advocate's payout setup
                    </p>
                  )
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold capitalize ${
                    PAYOUT_TONE[payment.payout_status] ?? "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {payment.payout_status}
                </span>
                {payment.status === "completed" &&
                  payment.payout_status !== "completed" &&
                  payment.payout_status !== "processing" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={retryingId === payment.id}
                      onClick={() => void retry(payment.id)}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${retryingId === payment.id ? "animate-spin" : ""}`}
                      />
                      Retry
                    </Button>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
