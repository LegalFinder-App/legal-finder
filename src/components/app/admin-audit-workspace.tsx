import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import {
  StatCard,
  StatusPill,
  EmptyState,
  LoadingRows,
  QueryError,
} from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { lawyersQuery, auditLogsQuery } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";

function formatAuditValue(value: unknown) {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `${value.length} item(s)`;
  return JSON.stringify(value, null, 2);
}

export function AdminAuditWorkspace() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const lawyers = useQuery(lawyersQuery());
  const auditLogs = useQuery(auditLogsQuery(user?.id));

  const totalEvents = auditLogs.data?.length ?? 0;
  const touchedTables = new Set((auditLogs.data ?? []).map((entry) => entry.table_name)).size;

  const setVerification = async (lawyerId: string, verified: boolean) => {
    const { error } = await supabase.from("lawyers").update({ verified }).eq("id", lawyerId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(verified ? "Advocate verified" : "Verification removed");
    queryClient.invalidateQueries({ queryKey: ["lawyers"] });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">Administration</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Audit & verification</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Administrative actions are written to a tamper-evident audit trail and reviewed from the
        same workspace.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Audit events"
          value={totalEvents}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Tables touched"
          value={touchedTables}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Verified advocates"
          value={lawyers.data?.filter((lawyer) => lawyer.verified).length ?? 0}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Pending verifications"
          value={lawyers.data?.filter((lawyer) => !lawyer.verified).length ?? 0}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section>
          <h2 className="font-display text-xl font-semibold">Audit trail</h2>
          <div className="mt-4 space-y-3">
            {auditLogs.isLoading ? (
              <LoadingRows rows={5} />
            ) : auditLogs.isError ? (
              <QueryError
                message={auditLogs.error instanceof Error ? auditLogs.error.message : undefined}
                onRetry={() => auditLogs.refetch()}
              />
            ) : (auditLogs.data ?? []).length === 0 ? (
              <EmptyState
                title="No audit events yet"
                description="Administrative changes, message activity and record updates will appear here."
              />
            ) : (
              (auditLogs.data ?? []).map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-lg border border-border bg-card p-5 shadow-plate"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-brass">{entry.table_name}</p>
                      <h3 className="mt-1 font-display text-base font-semibold">
                        {entry.action.replace(/_/g, " ")}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.actor_name ?? entry.actor_id ?? "System"} ·{" "}
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                    <StatusPill value={entry.action.toLowerCase()} />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border border-border bg-secondary/40 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Before
                      </p>
                      <pre className="mt-2 overflow-x-auto text-xs leading-relaxed text-muted-foreground">
                        {formatAuditValue(entry.before_data)}
                      </pre>
                    </div>
                    <div className="rounded-md border border-border bg-secondary/40 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        After
                      </p>
                      <pre className="mt-2 overflow-x-auto text-xs leading-relaxed text-muted-foreground">
                        {formatAuditValue(entry.after_data)}
                      </pre>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Advocate verification</h2>
          <div className="mt-4 space-y-3">
            {lawyers.isLoading ? (
              <LoadingRows rows={4} />
            ) : lawyers.isError ? (
              <QueryError
                message={lawyers.error instanceof Error ? lawyers.error.message : undefined}
                onRetry={() => lawyers.refetch()}
              />
            ) : (
              (lawyers.data ?? []).map((lawyer) => (
                <div
                  key={lawyer.id}
                  className="rounded-lg border border-border bg-card p-5 shadow-plate"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display font-semibold">{lawyer.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lawyer.firm ?? "Independent"}
                      </p>
                    </div>
                    <StatusPill value={lawyer.verified ? "active" : "pending"} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {lawyer.bar_number ?? "Bar number pending"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!lawyer.verified ? (
                      <Button
                        size="sm"
                        variant="brass"
                        onClick={() => setVerification(lawyer.id, true)}
                      >
                        Verify advocate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setVerification(lawyer.id, false)}
                      >
                        Revoke verification
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
