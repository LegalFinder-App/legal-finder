import { queryOptions } from "@tanstack/react-query";
import { supabase } from "./supabase";

// A port of the web's src/lib/lawyer-payout.ts — same table, same query key. RLS lets an advocate
// read and write only their own row; the payout itself runs on the server (payouts.server.ts).

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

// lawyer_payout_accounts isn't in the generated types (same as on the web).
const payoutAccounts = supabase as unknown as {
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
    enabled: Boolean(lawyerUserId),
    queryFn: async (): Promise<LawyerPayoutAccount | null> => {
      const { data, error } = await payoutAccounts
        .from("lawyer_payout_accounts")
        .select("*")
        .eq("lawyer_user_id", lawyerUserId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

export async function saveLawyerPayoutAccount(
  values: Omit<LawyerPayoutAccount, "updated_at">,
): Promise<void> {
  const { error } = await payoutAccounts
    .from("lawyer_payout_accounts")
    .upsert({ ...values, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
