import { beforeEach, describe, expect, it, vi } from "vitest";

// Stand-ins for Clerk and the service-role Supabase client: record each delete, and let a test
// make one table (or Clerk) fail.
const world = vi.hoisted(() => {
  const deletes: string[] = [];
  const failing = new Map<string, string>();
  const deleteUser = vi.fn();
  const from = (table: string) => ({
    delete: () => ({
      eq: async (column: string, value: string) => {
        deletes.push(`${table}.${column}=${value}`);
        const message = failing.get(table);
        return { error: message ? { message } : null };
      },
    }),
  });
  return { deletes, failing, deleteUser, from };
});

vi.mock("@clerk/tanstack-react-start/server", () => ({
  clerkClient: () => ({ users: { deleteUser: world.deleteUser } }),
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: world.from } }));

import { deprovisionUser } from "@/integrations/clerk/deprovisioning.server";

const USER = "user_advocate";

beforeEach(() => {
  world.deletes.length = 0;
  world.failing.clear();
  world.deleteUser.mockReset();
  world.deleteUser.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

describe("deprovisionUser", () => {
  it("removes the sign-in, then everything that only makes sense while the account exists", async () => {
    await deprovisionUser(USER);
    expect(world.deleteUser).toHaveBeenCalledWith(USER);
    expect(world.deletes).toEqual([
      `user_roles.user_id=${USER}`,
      `profiles.id=${USER}`,
      // The public directory listing: without this a deleted advocate stays listed.
      `lawyers.user_id=${USER}`,
      `lawyer_payout_accounts.lawyer_user_id=${USER}`,
      `push_subscriptions.user_id=${USER}`,
      `device_push_tokens.user_id=${USER}`,
    ]);
  });

  it("stops before touching any data when Clerk refuses for another reason", async () => {
    world.deleteUser.mockRejectedValue(Object.assign(new Error("Forbidden"), { status: 403 }));
    await expect(deprovisionUser(USER)).rejects.toThrow("Forbidden");
    expect(world.deletes).toEqual([]);
  });

  it("finishes the cleanup when the sign-in was already removed by an earlier attempt", async () => {
    world.deleteUser.mockRejectedValue(Object.assign(new Error("Not Found"), { status: 404 }));
    await expect(deprovisionUser(USER)).resolves.toBeUndefined();
    expect(world.deletes).toHaveLength(6);
  });

  it("still runs the remaining steps when one fails, then reports the failure", async () => {
    world.failing.set("profiles", "connection reset");
    await expect(deprovisionUser(USER)).rejects.toThrow("connection reset");
    expect(world.deletes).toContain(`lawyers.user_id=${USER}`);
    expect(world.deletes).toContain(`lawyer_payout_accounts.lawyer_user_id=${USER}`);
  });

  it("doesn't fail over phone push tokens, whose table may not exist yet", async () => {
    world.failing.set("device_push_tokens", "Could not find the table");
    await expect(deprovisionUser(USER)).resolves.toBeUndefined();
  });
});
