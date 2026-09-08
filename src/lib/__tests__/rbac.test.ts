import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { loadUserRoles, requireRoles } from "../rbac";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [{ role: "user" }],
          error: null,
        })),
      })),
    })),
  },
}));

describe("RBAC integration", () => {
  it("loadUserRoles fetches roles correctly", async () => {
    const queryClient = new QueryClient();
    const roles = await loadUserRoles(queryClient, "user-123");
    expect(roles).toEqual(["user"]);
  });

  it("requireRoles throws redirect for unauthorized role", async () => {
    const handler = requireRoles(["admin"]);
    const context = { user: { id: "user-123" }, queryClient: new QueryClient() };

    // loadUserRoles resolves to ["user"] (mocked above), so an "admin" requirement redirects.
    await expect(handler({ context })).rejects.toThrow();
  });
});
