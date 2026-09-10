import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  lawyerPayoutAccountQuery,
  saveLawyerPayoutAccount,
  type MobileNetwork,
  type PayoutMethod,
} from "@/lib/lawyer-payout";

/** How a lawyer receives their consultation fees — paid out automatically via Flutterwave the
 * instant a client's payment is confirmed (see src/lib/payouts.server.ts). */
export function PayoutDetailsCard({ lawyerUserId }: { lawyerUserId: string | undefined }) {
  const queryClient = useQueryClient();
  const account = useQuery(lawyerPayoutAccountQuery(lawyerUserId));
  const [method, setMethod] = useState<PayoutMethod>("mobile_money");
  const [mobileNetwork, setMobileNetwork] = useState<MobileNetwork>("MTN");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!account.data) return;
    setMethod(account.data.method);
    setMobileNetwork(account.data.mobile_network ?? "MTN");
    setPhoneNumber(account.data.phone_number ?? "");
    setBankCode(account.data.bank_code ?? "");
    setAccountNumber(account.data.account_number ?? "");
    setAccountName(account.data.account_name ?? "");
  }, [account.data]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lawyerUserId) return;
    setSaving(true);
    try {
      await saveLawyerPayoutAccount({
        lawyer_user_id: lawyerUserId,
        method,
        mobile_network: method === "mobile_money" ? mobileNetwork : null,
        phone_number: method === "mobile_money" ? phoneNumber.trim() : null,
        bank_code: method === "bank" ? bankCode.trim() : null,
        account_number: method === "bank" ? accountNumber.trim() : null,
        account_name: method === "bank" ? accountName.trim() : null,
      });
      await queryClient.invalidateQueries({ queryKey: ["lawyer-payout-account", lawyerUserId] });
      toast.success("Payout details saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save payout details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Consultation fees are paid out to this account automatically — you keep 100% of every fee,
        as soon as the client's payment clears.
      </p>

      <div className="space-y-2">
        <Label>Payout method</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["mobile_money", "bank"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                method === value
                  ? "border-brass bg-brass/10 text-accent-foreground"
                  : "border-border hover:bg-secondary"
              }`}
            >
              {value === "mobile_money" ? "Mobile money" : "Bank account"}
            </button>
          ))}
        </div>
      </div>

      {method === "mobile_money" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mobile-network">Network</Label>
            <Select
              value={mobileNetwork}
              onValueChange={(value) => setMobileNetwork(value as MobileNetwork)}
            >
              <SelectTrigger id="mobile-network">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MTN">MTN</SelectItem>
                <SelectItem value="AIRTEL">Airtel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone-number">Phone number</Label>
            <Input
              id="phone-number"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="7XXXXXXXX"
              required
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bank-code">Bank</Label>
            <Input
              id="bank-code"
              value={bankCode}
              onChange={(event) => setBankCode(event.target.value)}
              placeholder="Bank code"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-number">Account number</Label>
            <Input
              id="account-number"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="account-name">Account name</Label>
            <Input
              id="account-name"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              required
            />
          </div>
        </div>
      )}

      <Button type="submit" variant="brass" disabled={saving || !lawyerUserId}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save payout details
      </Button>
    </form>
  );
}
