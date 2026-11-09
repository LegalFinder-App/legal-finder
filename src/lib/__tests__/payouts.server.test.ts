import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase } from "@/integrations/supabase/app-database";

type Row = Record<string, unknown>;

// A small in-memory stand-in for the two Supabase clients (service role + the caller's own),
// covering exactly the calls payouts.server.ts makes.
const db = vi.hoisted(() => {
  const tables: Record<string, Record<string, unknown>[]> = {};
  const updates: { table: string; values: Record<string, unknown> }[] = [];
  const from = (table: string) => ({
    select: () => ({
      eq: (column: string, value: unknown) => {
        const rows = (tables[table] ?? []).filter((row) => row[column] === value);
        return {
          maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
          then: (resolve: (result: { data: typeof rows; error: null }) => unknown) =>
            resolve({ data: rows, error: null }),
        };
      },
    }),
    // update(...).eq(...).in(...).select(...): filters collect, and awaiting applies the update to
    // the matching rows only — the conditional "claim" in attemptLawyerPayout depends on that.
    update: (values: Record<string, unknown>) => {
      const filters: ((row: Record<string, unknown>) => boolean)[] = [];
      const builder = {
        eq: (column: string, value: unknown) => {
          filters.push((row) => row[column] === value);
          return builder;
        },
        in: (column: string, list: unknown[]) => {
          filters.push((row) => list.includes(row[column]));
          return builder;
        },
        select: () => builder,
        then: (resolve: (result: { data: unknown[]; error: null }) => unknown) => {
          const matched = (tables[table] ?? []).filter((row) => filters.every((f) => f(row)));
          if (matched.length) updates.push({ table, values });
          for (const row of matched) Object.assign(row, values);
          return resolve({ data: matched.map((row) => ({ id: row.id })), error: null });
        },
      };
      return builder;
    },
  });
  return { tables, updates, from, submitTransfer: vi.fn(), getTransactionStatus: vi.fn() };
});

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: db.from } }));
vi.mock("@/lib/flutterwave.server", () => ({ submitTransfer: db.submitTransfer }));
vi.mock("@/lib/pesapal.server", () => ({ getTransactionStatus: db.getTransactionStatus }));

import { attemptLawyerPayout, retryLawyerPayoutAsAdmin } from "../payouts.server";

const PAYMENT = "11111111-1111-4111-8111-111111111111";
const caller = (userId: string) => ({
  userId,
  supabase: { from: db.from } as unknown as SupabaseClient<AppDatabase>,
});

function seed({ payment, payoutAccount = true }: { payment: Row; payoutAccount?: boolean }) {
  for (const table of Object.keys(db.tables)) delete db.tables[table];
  db.tables.payments = [
    {
      id: PAYMENT,
      client_id: "user_client",
      lawyer_id: "user_lawyer",
      amount: 50000,
      currency: "UGX",
      description: "Consultation",
      status: "completed",
      payout_status: "pending",
      payout_failure_reason: null,
      ...payment,
    },
  ];
  db.tables.lawyer_payout_accounts = payoutAccount
    ? [
        {
          lawyer_user_id: "user_lawyer",
          method: "mobile_money",
          mobile_network: "MTN",
          phone_number: "770000000",
        },
      ]
    : [];
  db.tables.lawyers = [{ user_id: "user_lawyer", full_name: "Okello James" }];
  db.tables.user_roles = [
    { user_id: "user_admin", role: "admin" },
    { user_id: "user_lawyer", role: "lawyer" },
  ];
}

beforeEach(() => {
  db.updates.length = 0;
  db.submitTransfer.mockReset();
  db.submitTransfer.mockResolvedValue({ transferId: "trf_1", reference: PAYMENT });
});

describe("attemptLawyerPayout", () => {
  it("pays out a completed payment and leaves it processing until the webhook confirms", async () => {
    seed({ payment: {} });
    await attemptLawyerPayout(PAYMENT);

    expect(db.submitTransfer).toHaveBeenCalledTimes(1);
    expect(db.submitTransfer.mock.calls[0][0]).toMatchObject({
      reference: PAYMENT,
      amount: 50000,
      recipient: { method: "mobile_money", firstName: "Okello", lastName: "James" },
    });
    expect(db.tables.payments[0]).toMatchObject({
      payout_status: "processing",
      flutterwave_transfer_id: "trf_1",
    });
  });

  // Every advocate-linked payment starts with payout_status 'pending' (a DB trigger sets it at
  // insert), so that status alone must never be read as "the client paid".
  it.each(["pending", "failed", "cancelled"])(
    "never transfers money for a payment the client hasn't completed (%s)",
    async (status) => {
      seed({ payment: { status } });
      await attemptLawyerPayout(PAYMENT);

      expect(db.submitTransfer).not.toHaveBeenCalled();
      expect(db.updates).toEqual([]);
    },
  );

  it.each(["processing", "completed"])("doesn't pay twice (payout already %s)", async (payout) => {
    seed({ payment: { payout_status: payout } });
    await attemptLawyerPayout(PAYMENT);
    expect(db.submitTransfer).not.toHaveBeenCalled();
  });

  it("waits, without transferring, when the advocate has no payout details", async () => {
    seed({ payment: {}, payoutAccount: false });
    await attemptLawyerPayout(PAYMENT);

    expect(db.submitTransfer).not.toHaveBeenCalled();
    expect(db.tables.payments[0].payout_status).toBe("pending");
  });

  it("records a failed transfer on the payment instead of throwing", async () => {
    seed({ payment: {} });
    db.submitTransfer.mockRejectedValue(new Error("Insufficient balance"));
    await expect(attemptLawyerPayout(PAYMENT)).resolves.toBeUndefined();

    expect(db.tables.payments[0]).toMatchObject({
      payout_status: "failed",
      payout_failure_reason: "Insufficient balance",
    });
  });
});

describe("retryLawyerPayoutAsAdmin", () => {
  it("refuses anyone who isn't an administrator", async () => {
    seed({ payment: {} });
    await expect(retryLawyerPayoutAsAdmin(caller("user_lawyer"), PAYMENT)).rejects.toThrow(
      "Only administrators can do this.",
    );
    expect(db.submitTransfer).not.toHaveBeenCalled();
  });

  it("refuses a payment the client hasn't paid, and says why", async () => {
    seed({ payment: { status: "pending" } });
    await expect(retryLawyerPayoutAsAdmin(caller("user_admin"), PAYMENT)).rejects.toThrow(
      "The client's payment hasn't completed",
    );
    expect(db.submitTransfer).not.toHaveBeenCalled();
    expect(db.updates).toEqual([]);
  });

  it("reports a payment that no longer exists", async () => {
    seed({ payment: {} });
    await expect(
      retryLawyerPayoutAsAdmin(caller("user_admin"), "22222222-2222-4222-8222-222222222222"),
    ).rejects.toThrow("That payment no longer exists.");
  });

  it("retries a paid payment and reports where the payout stands", async () => {
    seed({ payment: { payout_status: "failed", payout_failure_reason: "Timeout" } });
    await expect(retryLawyerPayoutAsAdmin(caller("user_admin"), PAYMENT)).resolves.toEqual({
      payoutStatus: "processing",
      failureReason: null,
    });
    expect(db.submitTransfer).toHaveBeenCalledTimes(1);
  });

  it("reports 'pending' when the advocate still has no payout details", async () => {
    seed({ payment: {}, payoutAccount: false });
    await expect(retryLawyerPayoutAsAdmin(caller("user_admin"), PAYMENT)).resolves.toEqual({
      payoutStatus: "pending",
      failureReason: null,
    });
    expect(db.submitTransfer).not.toHaveBeenCalled();
  });
});
