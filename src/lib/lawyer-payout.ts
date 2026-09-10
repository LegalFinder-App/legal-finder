import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PayoutMethod = "mobile_money" | "bank";
export type MobileNetwork = "MTN" | "AIRTEL";

export interface LawyerPayoutAccount {
  lawyer_user_id: string;
  method: PayoutMethod;
  mobile_network: MobileNetwork | null;
  phone_number: string | null;
  bank_code: string | null;
  account_number: string | null;
  account_name: string | null;
  updated_at: string;
}

// Same pattern as src/lib/app-settings.ts — written before `supabase gen types` has seen
// lawyer_payout_accounts (added in 20260911120000_lawyer_payouts.sql). Not part of AppDatabase
// because its primary key (lawyer_user_id) doesn't fit the generic `insertRow`/`updateRow`
// helpers in src/lib/mutations.ts (those key on an `id` column) — this needs an upsert.
const payoutAccountClient = supabase as unknown as {
  from: (table: "lawyer_payout_accounts") => {
    select: (columns: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        maybeSingle: () => Promise<{
          data: LawyerPayoutAccount | null;
          error: { message: string } | null;
        }>;
      };
    };
    upsert: (
      values: Partial<LawyerPayoutAccount> & { lawyer_user_id: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

export const lawyerPayoutAccountQuery = (lawyerUserId: string | undefined) =>
  queryOptions({
    queryKey: ["lawyer-payout-account", lawyerUserId],
    queryFn: async (): Promise<LawyerPayoutAccount | null> => {
      if (!lawyerUserId) return null;
      const { data, error } = await payoutAccountClient
        .from("lawyer_payout_accounts")
        .select("*")
        .eq("lawyer_user_id", lawyerUserId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!lawyerUserId,
  });

export async function saveLawyerPayoutAccount(
  values: Partial<LawyerPayoutAccount> & { lawyer_user_id: string },
): Promise<void> {
  const { error } = await payoutAccountClient
    .from("lawyer_payout_accounts")
    .upsert({ ...values, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
