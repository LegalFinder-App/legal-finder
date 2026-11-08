import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, UserPlus, Wand2, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { StatCard, EmptyState, LoadingRows, QueryError } from "@/components/common/bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import { allProfilesQuery, allUserRolesQuery } from "@/lib/queries";
import { assignRole, deleteUser, revokeRole } from "@/lib/mutations";
import { backfillProfileNames } from "@/lib/admin-users.functions";
import { ROLE_LABELS, useSession, type AppRole } from "@/lib/session";

const ALL_ROLES: AppRole[] = ["user", "lawyer", "police", "judiciary", "admin"];

export function UsersPanel() {
  const { user: currentUser } = useSession();
  const queryClient = useQueryClient();
  const profiles = useQuery(allProfilesQuery);
  const userRoles = useQuery(allUserRolesQuery);
  const [search, setSearch] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const rolesByUser = useMemo(() => {
    const map = new Map<string, AppRole[]>();
    for (const row of userRoles.data ?? []) {
      const list = map.get(row.user_id) ?? [];
      list.push(row.role as AppRole);
      map.set(row.user_id, list);
    }
    return map;
  }, [userRoles.data]);

  const filteredProfiles = useMemo(() => {
    const rows = profiles.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.full_name?.toLowerCase().includes(term) || row.email?.toLowerCase().includes(term),
    );
  }, [profiles.data, search]);

  const invalidate = (userId: string) => {
    queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
    queryClient.invalidateQueries({ queryKey: ["roles", userId] });
  };

  const handleAssign = async (userId: string, role: AppRole) => {
    setBusyKey(`${userId}:${role}`);
    try {
      await assignRole(userId, role);
      toast.success(`${ROLE_LABELS[role]} role added`);
      invalidate(userId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add role");
    } finally {
      setBusyKey(null);
    }
  };

  const handleRevoke = async (userId: string, role: AppRole) => {
    setBusyKey(`${userId}:${role}`);
    try {
      await revokeRole(userId, role);
      toast.success(`${ROLE_LABELS[role]} role removed`);
      invalidate(userId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove role");
    } finally {
      setBusyKey(null);
    }
  };

  const handleDelete = async (userId: string) => {
    setBusyKey(`${userId}:delete`);
    try {
      await deleteUser(userId);
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      invalidate(userId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete user");
    } finally {
      setBusyKey(null);
    }
  };

  const [backfilling, setBackfilling] = useState(false);
  const missingNameCount = (profiles.data ?? []).filter((row) => !row.full_name).length;

  const handleBackfillNames = async () => {
    setBackfilling(true);
    try {
      const { fixed } = await backfillProfileNames();
      toast.success(fixed > 0 ? `Fixed ${fixed} user name(s)` : "No missing names found");
      if (fixed > 0) queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to fix names");
    } finally {
      setBackfilling(false);
    }
  };

  const isLoading = profiles.isLoading || userRoles.isLoading;
  const isError = profiles.isError || userRoles.isError;
  const errorMessage =
    (profiles.error instanceof Error ? profiles.error.message : undefined) ??
    (userRoles.error instanceof Error ? userRoles.error.message : undefined);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered users" value={profiles.data?.length ?? 0} />
        <StatCard
          label="Administrators"
          value={(userRoles.data ?? []).filter((row) => row.role === "admin").length}
        />
        <StatCard label="Role assignments" value={(userRoles.data ?? []).length} />
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Users &amp; roles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign or revoke platform roles. Changes are written to the audit trail.
          </p>
        </div>
        <div className="flex items-end gap-2">
          {missingNameCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={backfilling}
              onClick={() => void handleBackfillNames()}
            >
              <Wand2 className="h-3.5 w-3.5" />
              {backfilling ? "Fixing…" : `Fix ${missingNameCount} missing name(s)`}
            </Button>
          )}
          <div className="w-full max-w-xs">
            <Label htmlFor="user-search" className="sr-only">
              Search users
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="user-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <LoadingRows rows={6} />
        ) : isError ? (
          <QueryError
            message={errorMessage}
            onRetry={() => {
              profiles.refetch();
              userRoles.refetch();
            }}
          />
        ) : filteredProfiles.length === 0 ? (
          <EmptyState title="No users found" description="Try a different search term." />
        ) : (
          filteredProfiles.map((profile) => {
            const roles = rolesByUser.get(profile.id) ?? [];
            const availableRoles = ALL_ROLES.filter((role) => !roles.includes(role));
            const isSelf = profile.id === currentUser?.id;

            return (
              <div
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-4 card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-display font-semibold">
                    {profile.full_name || "Unnamed user"}
                    {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {roles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No roles assigned</span>
                  ) : (
                    roles.map((role) => {
                      const key = `${profile.id}:${role}`;
                      const preventSelfDemotion = isSelf && role === "admin";
                      return (
                        <Badge key={role} variant="brass" className="gap-1 pr-1">
                          {ROLE_LABELS[role]}
                          <button
                            type="button"
                            disabled={busyKey === key || preventSelfDemotion}
                            onClick={() => handleRevoke(profile.id, role)}
                            aria-label={`Remove ${ROLE_LABELS[role]} role`}
                            title={
                              preventSelfDemotion
                                ? "You can't remove your own admin role"
                                : undefined
                            }
                            className="rounded-full p-0.5 hover:bg-brass/25 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })
                  )}
                  {availableRoles.length > 0 && (
                    <Select
                      value=""
                      onValueChange={(role) => handleAssign(profile.id, role as AppRole)}
                    >
                      <SelectTrigger className="h-8 w-40 gap-1 text-xs">
                        <UserPlus className="h-3.5 w-3.5" />
                        <SelectValue placeholder="Add role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {!isSelf && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={busyKey === `${profile.id}:delete`}
                          aria-label={`Delete ${profile.full_name || profile.email || "user"}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete {profile.full_name || profile.email || "this user"}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes their Clerk account and removes them from Users
                            &amp; roles — they'll no longer be able to sign in. Their case, document
                            and message history is kept for the audit trail.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleDelete(profile.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
