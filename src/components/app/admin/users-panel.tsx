import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownUp,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  FileCheck2,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { StatCard, EmptyState, QueryError } from "@/components/common/bits";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { allProfilesQuery, allUserRolesQuery, type ProfileRow } from "@/lib/queries";
import { assignRole, deleteUser, revokeRole } from "@/lib/mutations";
import { backfillProfileNames } from "@/lib/admin-users.functions";
import { ROLE_LABELS, useSession, type AppRole } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Profile = ProfileRow;

// The database only lets an approved application grant these (professional onboarding
// migration) — even admins can't assign them here, so the UI doesn't offer them.
const APPLICATION_ONLY: AppRole[] = ["lawyer", "police", "judiciary"];
const ASSIGNABLE: AppRole[] = ["user", "admin"];

type Filter = "all" | AppRole | "none";
type Sort = "newest" | "oldest" | "name";
const PAGE_SIZE = 20;

const ROLE_TONE: Record<AppRole, string> = {
  user: "bg-secondary text-foreground",
  lawyer: "bg-accent text-accent-foreground",
  police: "bg-info/12 text-info",
  judiciary: "bg-success/12 text-success",
  admin: "bg-primary text-primary-foreground",
};

export function UsersPanel() {
  const { user: currentUser } = useSession();
  const queryClient = useQueryClient();
  const profiles = useQuery(allProfilesQuery);
  const userRoles = useQuery(allUserRolesQuery);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const rolesByUser = useMemo(() => {
    const map = new Map<string, AppRole[]>();
    for (const row of userRoles.data ?? []) {
      const list = map.get(row.user_id) ?? [];
      list.push(row.role as AppRole);
      map.set(row.user_id, list);
    }
    return map;
  }, [userRoles.data]);

  const all = useMemo(() => profiles.data ?? [], [profiles.data]);
  const weekAgo = Date.now() - 7 * 24 * 3600_000;
  const stats = useMemo(
    () => ({
      total: all.length,
      newThisWeek: all.filter((p) => new Date(p.created_at).getTime() > weekAgo).length,
      admins: all.filter((p) => rolesByUser.get(p.id)?.includes("admin")).length,
      professionals: all.filter((p) =>
        rolesByUser.get(p.id)?.some((r) => APPLICATION_ONLY.includes(r)),
      ).length,
      pending: all.filter(
        (p) =>
          p.requested_role &&
          APPLICATION_ONLY.includes(p.requested_role as AppRole) &&
          !rolesByUser.get(p.id)?.includes(p.requested_role as AppRole),
      ).length,
    }),
    [all, rolesByUser, weekAgo],
  );

  const countFor = (f: Filter) =>
    f === "all"
      ? all.length
      : f === "none"
        ? all.filter((p) => !(rolesByUser.get(p.id)?.length ?? 0)).length
        : all.filter((p) => rolesByUser.get(p.id)?.includes(f)).length;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = all.filter((p) => {
      const roles = rolesByUser.get(p.id) ?? [];
      if (filter === "none" && roles.length > 0) return false;
      if (filter !== "all" && filter !== "none" && !roles.includes(filter)) return false;
      if (!term) return true;
      return [p.full_name, p.email, p.phone, p.city].some((v) => v?.toLowerCase().includes(term));
    });
    return [...rows].sort((a, b) =>
      sort === "name"
        ? (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "")
        : sort === "oldest"
          ? a.created_at.localeCompare(b.created_at)
          : b.created_at.localeCompare(a.created_at),
    );
  }, [all, rolesByUser, search, filter, sort]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(visible, PAGE_SIZE);

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
      setOpenId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      invalidate(userId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete user");
    } finally {
      setBusyKey(null);
    }
  };

  const [backfilling, setBackfilling] = useState(false);
  const missingNameCount = all.filter((row) => !row.full_name).length;
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
  const show = (n: number) => (isLoading ? "—" : n.toLocaleString("en-GB"));
  const openProfile = all.find((p) => p.id === openId) ?? null;

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "user", label: "Clients" },
    { id: "lawyer", label: "Advocates" },
    { id: "police", label: "Police" },
    { id: "judiciary", label: "Judiciary" },
    { id: "admin", label: "Admins" },
    { id: "none", label: "No role" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Users"
          value={show(stats.total)}
          icon={<Users />}
          hint={`${stats.newThisWeek} new this week`}
        />
        <StatCard
          label="Professionals"
          value={show(stats.professionals)}
          icon={<BadgeCheck />}
          hint="Advocates, police, judiciary"
        />
        <StatCard
          label="Administrators"
          value={show(stats.admins)}
          icon={<ShieldCheck />}
          hint="Full access"
        />
        <Link
          to="/admin/applications"
          className="block rounded-[calc(var(--radius)+8px)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <StatCard
            label="Awaiting review"
            value={show(stats.pending)}
            icon={<FileCheck2 />}
            hint="Professional sign-ups → Applications"
          />
        </Link>
      </div>

      {/* Toolbar */}
      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, phone or city"
              aria-label="Search users"
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <label className="relative">
              <span className="sr-only">Sort users</span>
              <ArrowDownUp
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-11 cursor-pointer appearance-none rounded-xl border border-input bg-card pl-10 pr-4 text-sm font-medium shadow-xs hover:border-foreground/25 focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/20 md:h-10"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>
            {missingNameCount > 0 && (
              <Button
                type="button"
                variant="outline"
                loading={backfilling}
                onClick={() => void handleBackfillNames()}
              >
                <Wand2 /> Fix {missingNameCount} name{missingNameCount === 1 ? "" : "s"}
              </Button>
            )}
          </div>
        </div>
        <div
          role="group"
          aria-label="Filter by role"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(1);
              }}
              className={cn(
                "press inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold",
                filter === f.id
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[0.68rem] tabular-nums",
                  filter === f.id ? "bg-white/15" : "bg-secondary",
                )}
              >
                {isLoading ? "–" : countFor(f.id)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="mt-5">
        {isLoading ? (
          <div className="card divide-y divide-border" role="status" aria-label="Loading users">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="h-11 w-11 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <QueryError
            message={errorMessage}
            onRetry={() => {
              profiles.refetch();
              userRoles.refetch();
            }}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No users found"
            description="Try another search or role."
          />
        ) : (
          <>
            <div className="card overflow-hidden">
              <div className="hidden items-center gap-4 border-b border-border bg-secondary/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:flex">
                <span className="flex-1">User</span>
                <span className="w-56">Roles</span>
                <span className="hidden w-28 lg:block">Joined</span>
                <span className="w-6" />
              </div>
              <ul className="divide-y divide-border">
                {pageItems.map((p) => {
                  const roles = rolesByUser.get(p.id) ?? [];
                  const pendingRole =
                    p.requested_role &&
                    APPLICATION_ONLY.includes(p.requested_role as AppRole) &&
                    !roles.includes(p.requested_role as AppRole)
                      ? (p.requested_role as AppRole)
                      : null;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(p.id)}
                        className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40 md:gap-4"
                      >
                        <Avatar profile={p} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold tracking-tight group-hover:text-brass">
                            {p.full_name || "Unnamed user"}
                            {p.id === currentUser?.id && (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-sm text-muted-foreground">
                            {p.email}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1 md:hidden">
                            <RolePills roles={roles} pendingRole={pendingRole} />
                          </span>
                        </span>
                        <span className="hidden w-56 flex-wrap gap-1 md:flex">
                          <RolePills roles={roles} pendingRole={pendingRole} />
                        </span>
                        <span className="hidden w-28 text-sm tabular-nums text-muted-foreground lg:block">
                          {formatDate(p.created_at)}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, visible.length)} of{" "}
                {visible.length}
              </p>
              {totalPages > 1 && (
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
                  className="mx-0 w-auto"
                />
              )}
            </div>
          </>
        )}
      </div>

      <UserSheet
        profile={openProfile}
        roles={openProfile ? (rolesByUser.get(openProfile.id) ?? []) : []}
        isSelf={openProfile?.id === currentUser?.id}
        busyKey={busyKey}
        onClose={() => setOpenId(null)}
        onAssign={handleAssign}
        onRevoke={handleRevoke}
        onDelete={handleDelete}
      />
    </div>
  );
}

function Avatar({ profile, size = "md" }: { profile: Profile; size?: "md" | "lg" }) {
  const name = profile.full_name || profile.email || "?";
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  const dims = size === "lg" ? "h-20 w-20 text-xl" : "h-11 w-11 text-sm";
  return profile.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt=""
      loading="lazy"
      className={cn("shrink-0 rounded-full object-cover ring-2 ring-card", dims)}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--secondary))] font-bold text-accent-foreground ring-2 ring-card",
        dims,
      )}
    >
      {initials}
    </span>
  );
}

function RolePills({ roles, pendingRole }: { roles: AppRole[]; pendingRole: AppRole | null }) {
  return (
    <>
      {roles.length === 0 && !pendingRole && (
        <span className="text-xs text-muted-foreground">No role</span>
      )}
      {roles.map((r) => (
        <span
          key={r}
          className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-semibold", ROLE_TONE[r])}
        >
          {ROLE_LABELS[r]}
        </span>
      ))}
      {pendingRole && (
        <span className="rounded-full border border-dashed border-warning px-2 py-0.5 text-[0.7rem] font-semibold text-warning-foreground dark:text-warning">
          {ROLE_LABELS[pendingRole]} · pending
        </span>
      )}
    </>
  );
}

function UserSheet({
  profile,
  roles,
  isSelf,
  busyKey,
  onClose,
  onAssign,
  onRevoke,
  onDelete,
}: {
  profile: Profile | null;
  roles: AppRole[];
  isSelf: boolean;
  busyKey: string | null;
  onClose: () => void;
  onAssign: (userId: string, role: AppRole) => Promise<void>;
  onRevoke: (userId: string, role: AppRole) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");
  const addable = ASSIGNABLE.filter((r) => !roles.includes(r));
  const name = profile ? profile.full_name || profile.email || "this user" : "";

  return (
    <Sheet open={profile !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        {profile && (
          <>
            <div className="relative isolate overflow-hidden border-b border-border bg-sky px-6 pb-6 pt-[calc(2rem+var(--safe-top))]">
              <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light" />
              <Avatar profile={profile} size="lg" />
              <SheetTitle className="mt-4 text-xl font-bold">
                {profile.full_name || "Unnamed user"}
                {isSelf && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">(you)</span>
                )}
              </SheetTitle>
              <SheetDescription className="mt-1 flex flex-wrap gap-1">
                <RolePills
                  roles={roles}
                  pendingRole={
                    profile.requested_role &&
                    APPLICATION_ONLY.includes(profile.requested_role as AppRole) &&
                    !roles.includes(profile.requested_role as AppRole)
                      ? (profile.requested_role as AppRole)
                      : null
                  }
                />
              </SheetDescription>
            </div>

            <div className="flex-1 space-y-6 px-6 py-6">
              <section>
                <h3 className="eyebrow text-muted-foreground">Contact</h3>
                <ul className="mt-3 space-y-2.5 text-sm">
                  {profile.email && (
                    <li>
                      <a
                        href={`mailto:${profile.email}`}
                        className="flex items-center gap-2.5 hover:text-brass"
                      >
                        <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />{" "}
                        {profile.email}
                      </a>
                    </li>
                  )}
                  {profile.phone && (
                    <li>
                      <a
                        href={`tel:${profile.phone}`}
                        className="flex items-center gap-2.5 hover:text-brass"
                      >
                        <Phone className="h-4 w-4 text-muted-foreground" aria-hidden />{" "}
                        {profile.phone}
                      </a>
                    </li>
                  )}
                  {(profile.city || profile.country) && (
                    <li className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
                      {[profile.city, profile.country].filter(Boolean).join(", ")}
                    </li>
                  )}
                  <li className="flex items-center gap-2.5 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" aria-hidden /> Joined{" "}
                    {formatDate(profile.created_at)}
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="eyebrow text-muted-foreground">Roles</h3>
                <ul className="mt-3 space-y-2">
                  {roles.length === 0 && (
                    <li className="text-sm text-muted-foreground">No roles yet.</li>
                  )}
                  {roles.map((role) => {
                    const lockSelfAdmin = isSelf && role === "admin";
                    return (
                      <li
                        key={role}
                        className="card-inset flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            ROLE_TONE[role],
                          )}
                        >
                          {ROLE_LABELS[role]}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={lockSelfAdmin}
                          loading={busyKey === `${profile.id}:${role}`}
                          title={lockSelfAdmin ? "You can't remove your own admin role" : undefined}
                          onClick={() => void onRevoke(profile.id, role)}
                        >
                          <X /> Remove
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                {addable.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {addable.map((role) => (
                      <Button
                        key={role}
                        type="button"
                        size="sm"
                        variant="outline"
                        loading={busyKey === `${profile.id}:${role}`}
                        onClick={() => void onAssign(profile.id, role)}
                      >
                        <UserPlus /> Make {ROLE_LABELS[role].toLowerCase()}
                      </Button>
                    ))}
                  </div>
                )}
                <p className="mt-3 rounded-xl bg-secondary/70 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  Advocate, police and judiciary roles are granted by approving an application with
                  the required documents —{" "}
                  <Link
                    to="/admin/applications"
                    className="font-semibold text-brass hover:underline"
                  >
                    open Applications
                  </Link>
                  .
                </p>
              </section>

              {!isSelf && (
                <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                  <h3 className="text-sm font-bold text-destructive">Delete account</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Permanently deletes their sign-in and removes them from LegalFinder. Case,
                    document and message history is kept for the audit trail.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-3"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 /> Delete account…
                  </Button>
                </section>
              )}
            </div>

            <AlertDialog
              open={confirmDelete}
              onOpenChange={(o) => {
                setConfirmDelete(o);
                if (!o) setTyped("");
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This can't be undone. Type{" "}
                    <span className="font-mono font-semibold text-foreground">DELETE</span> to
                    confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  aria-label="Type DELETE to confirm"
                  autoComplete="off"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={typed !== "DELETE" || busyKey === `${profile.id}:delete`}
                    onClick={() => void onDelete(profile.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
