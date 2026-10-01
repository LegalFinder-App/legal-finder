import { useState } from "react";
import { View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import {
  Button,
  Card,
  Chip,
  ErrorState,
  Input,
  LoadingRows,
  SelectField,
  Text,
} from "@/components/ui";
import {
  lawyerPayoutAccountQuery,
  saveLawyerPayoutAccount,
  type LawyerPayoutAccount,
  type MobileNetwork,
  type PayoutMethod,
} from "@/lib/lawyer-payout";
import { formatDate } from "@/lib/format";
import { errorMessage, toast } from "@/lib/toast";

const METHODS: { value: PayoutMethod; label: string }[] = [
  { value: "mobile_money", label: "Mobile money" },
  { value: "bank", label: "Bank account" },
];
const NETWORKS: { value: MobileNetwork; label: string }[] = [
  { value: "MTN", label: "MTN" },
  { value: "AIRTEL", label: "Airtel" },
];

/**
 * How an advocate receives their consultation fees — paid out automatically the moment a client's
 * payment is confirmed (src/lib/payouts.server.ts on the web server). Same form as the web's
 * PayoutDetailsCard.
 */
export function PayoutDetailsCard({ lawyerUserId }: { lawyerUserId: string }) {
  const account = useQuery(lawyerPayoutAccountQuery(lawyerUserId));

  if (account.isLoading) return <LoadingRows rows={1} height={150} />;
  if (account.isError) {
    return (
      <ErrorState
        message={(account.error as Error).message}
        onRetry={() => void account.refetch()}
      />
    );
  }
  // Keyed so the form re-initialises when different saved details load, not on every refetch.
  return (
    <PayoutForm
      key={account.data?.updated_at ?? "new"}
      lawyerUserId={lawyerUserId}
      account={account.data ?? null}
    />
  );
}

function PayoutForm({
  lawyerUserId,
  account,
}: {
  lawyerUserId: string;
  account: LawyerPayoutAccount | null;
}) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const [method, setMethod] = useState<PayoutMethod>(account?.method ?? "mobile_money");
  const [network, setNetwork] = useState<MobileNetwork>(account?.mobile_network ?? "MTN");
  const [phone, setPhone] = useState(account?.phone_number ?? "");
  const [bankCode, setBankCode] = useState(account?.bank_code ?? "");
  const [accountNumber, setAccountNumber] = useState(account?.account_number ?? "");
  const [accountName, setAccountName] = useState(account?.account_name ?? "");
  const [saving, setSaving] = useState(false);

  const complete =
    method === "mobile_money"
      ? Boolean(phone.trim())
      : Boolean(bankCode.trim() && accountNumber.trim() && accountName.trim());

  const save = async () => {
    setSaving(true);
    try {
      const mobile = method === "mobile_money";
      await saveLawyerPayoutAccount({
        lawyer_user_id: lawyerUserId,
        method,
        mobile_network: mobile ? network : null,
        phone_number: mobile ? phone.trim() : null,
        bank_code: mobile ? null : bankCode.trim(),
        account_number: mobile ? null : accountNumber.trim(),
        account_name: mobile ? null : accountName.trim(),
      });
      await qc.invalidateQueries({ queryKey: ["lawyer-payout-account", lawyerUserId] });
      toast.success("Payout details saved");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save your payout details"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <View style={{ gap: 14 }}>
        <Text variant="small" tone="muted">
          Consultation fees are paid out to this account automatically — you keep 100% of every fee,
          as soon as the client’s payment clears.
        </Text>
        {!account ? (
          <View style={{ backgroundColor: colors.accent, borderRadius: 8, padding: 12 }}>
            <Text variant="small" style={{ color: colors.accentForeground }}>
              You haven’t added payout details yet. Fees can’t be paid out to you until you do.
            </Text>
          </View>
        ) : null}

        <View>
          <Text variant="small" style={{ fontFamily: fonts.sansMedium, marginBottom: 6 }}>
            Payout method
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {METHODS.map((m) => (
              <Chip
                key={m.value}
                label={m.label}
                selected={method === m.value}
                onPress={() => setMethod(m.value)}
              />
            ))}
          </View>
        </View>

        {method === "mobile_money" ? (
          <>
            <SelectField label="Network" value={network} onChange={setNetwork} options={NETWORKS} />
            <Input
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              placeholder="7XXXXXXXX"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </>
        ) : (
          <>
            <Input
              label="Bank"
              value={bankCode}
              onChangeText={setBankCode}
              placeholder="Bank code"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Input
              label="Account number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
            />
            <Input
              label="Account name"
              value={accountName}
              onChangeText={setAccountName}
              autoCapitalize="words"
              autoComplete="name"
            />
          </>
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <Button
            title="Save payout details"
            size="sm"
            loading={saving}
            disabled={!complete}
            onPress={() => void save()}
          />
          {account ? (
            <Text variant="small" tone="muted">
              Last updated {formatDate(account.updated_at)}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
