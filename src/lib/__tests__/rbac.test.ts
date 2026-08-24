import { describe, expect, it, vi } from "vitest";
import { loadUserRoles, requireRoles } from "../rbac";
import { supabase } from "@/integrations/supabase/client";

// Mock supabase
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
    const roles = await loadUserRoles("user-123");
    expect(roles).toEqual(["user"]);
  });

  it("requireRoles throws redirect for unauthorized role", async () => {
    const handler = requireRoles(["admin"]);
    // Simulate context with a user
    const context = { user: { id: "user-123" } };
    
    // We expect a redirect to be thrown. 
    // Since we mocked loadUserRoles to return ['user'], 
    // it should redirect for 'admin' requirement.
    await expect(handler({ context })).rejects.toThrow();
  });
});
