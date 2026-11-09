import { beforeEach, describe, expect, it, vi } from "vitest";

// finalizePayment runs from public URLs anyone can call with any tracking id. These tests feed it
// Pesapal answers (through a fake fetch) and a fake payments table, and check what it writes.
const db = vi.hoisted(() => {
  const rows: Record<string, unknown>[] = [];
  const writes: Record<string, unknown>[] = [];
  const from = () => ({
    select: () => ({
      eq: (column: string, value: unknown) => ({
        limit: async (n: number) => ({
          data: rows.filter((r) => r[column] === value).slice(0, n),
          error: null,
        }),
      }),
    }),
    update: (values: Record<string, unknown>) => ({
      eq: (column: string, value: unknown) => ({
        neq: async (notColumn: string, notValue: unknown) => {
          for (const r of rows)
            if (r[column] === value && r[notColumn] !== notValue) {
              Object.assign(r, values);
              writes.push(values);
            }
          return { error: null };
        },
      }),
    }),
  });
  return { rows, writes, from, attemptLawyerPayout: vi.fn() };
});

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: db.from } }));
vi.mock("@/lib/payouts.server", () => ({ attemptLawyerPayout: db.attemptLawyerPayout }));

import { finalizePayment } from "../pesapal.server";

const PAYMENT = "pay_1";

function pesapalSays(body: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).includes("RequestToken")
        ? Response.json({ token: "t", expiryDate: new Date(Date.now() + 3e5).toISOString() })
        : Response.json(body),
    ),
  );
}

const completed = {
  payment_status_description: "Completed",
  amount: 50000,
  currency: "UGX",
  merchant_reference: PAYMENT,
};

beforeEach(() => {
  process.env.PESAPAL_CONSUMER_KEY = "k";
  process.env.PESAPAL_CONSUMER_SECRET = "s";
  db.rows.length = 0;
  db.writes.length = 0;
  db.attemptLawyerPayout.mockReset();
  db.rows.push({
    id: PAYMENT,
    amount: 50000,
    currency: "UGX",
    status: "pending",
    pesapal_merchant_reference: PAYMENT,
    pesapal_order_tracking_id: "trk_1",
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("finalizePayment", () => {
  it("marks a matching completed order paid and starts the payout", async () => {
    pesapalSays(completed);
    await expect(finalizePayment("trk_1")).resolves.toBe("completed");
    expect(db.rows[0].status).toBe("completed");
    expect(db.attemptLawyerPayout).toHaveBeenCalledWith(PAYMENT);
  });

  it("leaves a payment pending when Pesapal's amount doesn't match", async () => {
    pesapalSays({ ...completed, amount: 500 });
    await expect(finalizePayment("trk_1")).resolves.toBe("pending");
    expect(db.rows[0].status).toBe("pending");
    expect(db.attemptLawyerPayout).not.toHaveBeenCalled();
  });

  it("leaves a payment pending when the order belongs to another payment", async () => {
    pesapalSays({ ...completed, merchant_reference: "pay_other" });
    await expect(finalizePayment("trk_1")).resolves.toBe("pending");
    expect(db.attemptLawyerPayout).not.toHaveBeenCalled();
  });

  it("never turns a confirmed payment back into an unpaid one (replayed notification)", async () => {
    db.rows[0].status = "completed";
    pesapalSays({ ...completed, payment_status_description: "Failed" });
    await expect(finalizePayment("trk_1")).resolves.toBe("completed");
    expect(db.rows[0].status).toBe("completed");
    expect(db.writes).toEqual([]);
  });

  it("records a failed order", async () => {
    pesapalSays({ ...completed, payment_status_description: "Failed" });
    await expect(finalizePayment("trk_1")).resolves.toBe("failed");
    expect(db.rows[0].status).toBe("failed");
  });

  it("refuses to act when two payments share one tracking id (tampered table)", async () => {
    db.rows.push({ ...db.rows[0], id: "pay_forged", status: "pending" });
    pesapalSays(completed);
    await expect(finalizePayment("trk_1")).resolves.toBe("pending");
    expect(db.writes).toEqual([]);
    expect(db.attemptLawyerPayout).not.toHaveBeenCalled();
  });

  it("writes nothing for a tracking id we never issued", async () => {
    pesapalSays(completed);
    await finalizePayment("trk_unknown");
    expect(db.writes).toEqual([]);
  });
});
