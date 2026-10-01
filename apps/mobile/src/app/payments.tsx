import { useState } from "react";
import { FlatList, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useWideLayout, wideContent } from "@/lib/layout";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingRows,
  StatusPill,
  Text,
} from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { useSession } from "@/lib/session";
import { paymentsQuery } from "@/lib/queries";
import { formatDateTime, formatUGX } from "@/lib/format";
import { payForPayment } from "@/lib/payments";
import { errorMessage, toast } from "@/lib/toast";

function Payments() {
  const { colors } = useTheme();
  const wide = useWideLayout();
  const { user } = useSession();
  const qc = useQueryClient();
  const payments = useQuery(paymentsQuery);
  const [paying, setPaying] = useState<string | null>(null);

  const pay = async (id: string) => {
    setPaying(id);
    try {
      const outcome = await payForPayment(id);
      if (outcome === "completed") toast.success("Payment received");
      else if (outcome === "failed") toast.error("Payment failed");
      else if (outcome === "pending")
        toast.message("Payment pending", {
          description: "We'll confirm once Pesapal finishes processing it.",
        });
      qc.invalidateQueries({ queryKey: ["payments"] });
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't start the payment"));
    } finally {
      setPaying(null);
    }
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[{ padding: 20, paddingBottom: 48 }, wide && wideContent]}
      data={payments.isLoading || payments.isError ? [] : (payments.data ?? [])}
      keyExtractor={(p) => p.id}
      refreshing={payments.isRefetching}
      onRefresh={() => void payments.refetch()}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={
        <Text variant="small" tone="muted" style={{ marginBottom: 14 }}>
          Consultation fees are processed securely by Pesapal. LegalFinder never sees your card or
          mobile-money details.
        </Text>
      }
      renderItem={({ item }) => {
        const payable =
          item.client_id === user?.id && (item.status === "pending" || item.status === "failed");
        return (
          <Card>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{item.description ?? "Consultation fee"}</Text>
                <Text variant="small" tone="muted">
                  {formatDateTime(item.created_at)}
                </Text>
              </View>
              <StatusPill value={item.status} />
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <Text variant="h3">{formatUGX(Number(item.amount))}</Text>
              {payable ? (
                <Button
                  title="Pay now"
                  size="sm"
                  loading={paying === item.id}
                  onPress={() => void pay(item.id)}
                />
              ) : null}
            </View>
          </Card>
        );
      }}
      ListEmptyComponent={
        payments.isLoading ? (
          <LoadingRows rows={3} />
        ) : payments.isError ? (
          <ErrorState
            message={(payments.error as Error).message}
            onRetry={() => void payments.refetch()}
          />
        ) : (
          <EmptyState
            icon={<CreditCard size={22} color={colors.brass} />}
            title="No payments yet"
            description="Consultation fees you pay or receive appear here."
          />
        )
      }
    />
  );
}

export default function PaymentsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Payments" }} />
      <RequireAuth>
        <Payments />
      </RequireAuth>
    </>
  );
}
