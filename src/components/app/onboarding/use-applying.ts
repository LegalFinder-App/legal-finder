import { useQuery } from "@tanstack/react-query";
import { profileQuery } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { editable, isApplicationRole, myApplicationsQuery } from "@/lib/onboarding";

/** True while a client has a professional application under way (or asked for one at sign-up). */
export function useApplying() {
  const { user, roles, primaryRole } = useSession();
  const profile = useQuery(profileQuery(user?.id));
  const apps = useQuery(myApplicationsQuery(user?.id));
  const requested = profile.data?.requested_role;
  const open = (apps.data ?? []).some((a) => editable(a.status) || a.status === "submitted");
  const asked =
    isApplicationRole(requested) &&
    !roles.includes(requested) &&
    !(apps.data ?? []).some((a) => a.role === requested);
  // Only treat as loading while a fetch is in flight for a signed-in user. Disabled queries
  // (no user id yet) must not keep the dashboard on a blank skeleton forever.
  const loading = Boolean(user?.id) && (profile.isLoading || apps.isLoading);
  return {
    loading,
    applying: primaryRole === "user" && (open || asked),
  };
}
