import { beforeEach, describe, expect, it, vi } from "vitest";

type UpsertCall = { table: string; payload: unknown; options: unknown };

const upsertCalls: UpsertCall[] = [];
let existingProfile: { id: string } | null = null;
let clerkUser = {
  id: "user_abc",
  firstName: "Ada",
  lastName: "Lovelace",
  emailAddresses: [{ id: "email_1", emailAddress: "ada@example.com" }],
  primaryEmailAddressId: "email_1",
  unsafeMetadata: { requested_role: "admin" } as Record<string, unknown>,
};

vi.mock("@clerk/tanstack-react-start/server", () => ({
  clerkClient: () => ({
    users: {
      getUser: async () => clerkUser,
    },
  }),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: existingProfile, error: null }),
        }),
      }),
      upsert: async (payload: unknown, options: unknown) => {
        upsertCalls.push({ table, payload, options });
        return { error: null };
      },
    }),
  },
}));

const { ensureProfileProvisioned } = await import("../provisioning.server");

describe("ensureProfileProvisioned", () => {
  beforeEach(() => {
    upsertCalls.length = 0;
    existingProfile = null;
    clerkUser = { ...clerkUser, unsafeMetadata: { requested_role: "admin" } };
  });

  it("does nothing if a profile row already exists", async () => {
    existingProfile = { id: "user_abc" };
    await ensureProfileProvisioned("user_abc");
    expect(upsertCalls).toHaveLength(0);
  });

  it("grants only the 'user' role even when unsafeMetadata requests admin", async () => {
    // unsafeMetadata is client-writable — a crafted signup request could set requested_role to
    // "admin" directly against Clerk's API. This is the one check that stops that from ever
    // becoming a real grant.
    await ensureProfileProvisioned("user_abc");
    const roleUpsert = upsertCalls.find((c) => c.table === "user_roles");
    expect(roleUpsert?.payload).toEqual({ user_id: "user_abc", role: "user" });
  });

  it("records the requested role on the profile as informational only", async () => {
    await ensureProfileProvisioned("user_abc");
    const profileUpsert = upsertCalls.find((c) => c.table === "profiles");
    expect(profileUpsert?.payload).toMatchObject({ requested_role: "admin" });
  });

  it("upserts the role with ignoreDuplicates so a concurrent first request can't error", async () => {
    await ensureProfileProvisioned("user_abc");
    const roleUpsert = upsertCalls.find((c) => c.table === "user_roles");
    expect(roleUpsert?.options).toMatchObject({
      onConflict: "user_id,role",
      ignoreDuplicates: true,
    });
  });

  it("treats an invalid requested_role as absent rather than throwing", async () => {
    clerkUser = { ...clerkUser, unsafeMetadata: { requested_role: "superadmin" } };
    await ensureProfileProvisioned("user_abc");
    const profileUpsert = upsertCalls.find((c) => c.table === "profiles");
    expect(profileUpsert?.payload).toMatchObject({ requested_role: null });
  });
});
