import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Filter,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  StatCard,
  StatusPill,
  EmptyState,
  LoadingRows,
  QueryError,
} from "@/components/common/bits";
import { auditLogsQuery, type AuditLog } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type AuditActionFilter = "all" | "INSERT" | "UPDATE" | "DELETE";

const ACTION_FILTERS: Array<{ id: AuditActionFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "INSERT", label: "Inserts" },
  { id: "UPDATE", label: "Updates" },
  { id: "DELETE", label: "Deletes" },
];

const SENSITIVE_KEYS = new Set([
  "password",
  "secret",
  "token",
  "access_token",
  "refresh_token",
  "auth_secret",
  "p256dh",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatFieldLabel(key: string) {
  return key.replace(/_/g, " ");
}

function formatCellValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString();
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (value.every((item) => typeof item === "string" || typeof item === "number")) {
      return value.join(", ");
    }
    return `${value.length} item(s)`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function sanitizeRecord(value: unknown): Record<string, unknown> | null {
  if (!isPlainObject(value)) return null;
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !SENSITIVE_KEYS.has(key.toLowerCase())),
  );
}

function valuesEqual(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function diffRecords(before: unknown, after: unknown) {
  const left = sanitizeRecord(before) ?? {};
  const right = sanitizeRecord(after) ?? {};
  const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();

  return keys
    .map((key) => ({
      key,
      before: left[key],
      after: right[key],
      changed: !valuesEqual(left[key], right[key]),
    }))
    .filter((row) => row.changed);
}

function AuditFieldRows({ data, emptyLabel }: { data: unknown; emptyLabel: string }) {
  const record = sanitizeRecord(data);
  const entries = record ? Object.entries(record).sort(([a], [b]) => a.localeCompare(b)) : [];

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <dl className="divide-y divide-border/70">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="grid grid-cols-[minmax(7rem,0.35fr)_1fr] gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {formatFieldLabel(key)}
          </dt>
          <dd className="break-words font-mono text-xs leading-relaxed text-foreground/90">
            {formatCellValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Compact insert payload viewer shown under the audit trail. */
function AuditInsertPanel({ data }: { data: unknown }) {
  return (
    <div className="rounded-md border border-success/25 bg-success/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <PlusCircle className="h-3.5 w-3.5 text-success" />
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-success">
          Inserted record
        </p>
      </div>
      <AuditFieldRows data={data} emptyLabel="No insert payload was recorded." />
    </div>
  );
}

/** Field-level update diff viewer shown under the audit trail. */
function AuditUpdatePanel({ before, after }: { before: unknown; after: unknown }) {
  const changes = useMemo(() => diffRecords(before, after), [before, after]);

  return (
    <div className="rounded-md border border-brass/30 bg-brass/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 text-brass" />
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brass">
            Updated fields
          </p>
        </div>
        <span className="rounded-full bg-background/80 px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
          {changes.length} change{changes.length === 1 ? "" : "s"}
        </span>
      </div>

      {changes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No field-level differences were detected for this update.
        </p>
      ) : (
        <div className="space-y-2.5">
          {changes.map((change) => (
            <div
              key={change.key}
              className="rounded-md border border-border/80 bg-card/80 px-3 py-2.5"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {formatFieldLabel(change.key)}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-sm bg-secondary/50 px-2.5 py-2">
                  <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Before
                  </p>
                  <p className="break-words font-mono text-xs text-muted-foreground">
                    {formatCellValue(change.before)}
                  </p>
                </div>
                <ArrowRight className="mx-auto hidden h-3.5 w-3.5 text-brass sm:block" />
                <div className="rounded-sm bg-brass/10 px-2.5 py-2">
                  <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-brass">
                    After
                  </p>
                  <p className="break-words font-mono text-xs text-foreground">
                    {formatCellValue(change.after)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditDeletePanel({ data }: { data: unknown }) {
  return (
    <div className="rounded-md border border-destructive/25 bg-destructive/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-destructive">
          Deleted record
        </p>
      </div>
      <AuditFieldRows data={data} emptyLabel="No delete payload was recorded." />
    </div>
  );
}

function AuditChangeBody({ entry }: { entry: AuditLog }) {
  const action = entry.action.toUpperCase();

  if (action === "INSERT") {
    return <AuditInsertPanel data={entry.after_data} />;
  }

  if (action === "UPDATE") {
    return <AuditUpdatePanel before={entry.before_data} after={entry.after_data} />;
  }

  if (action === "DELETE") {
    return <AuditDeletePanel data={entry.before_data} />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-md border border-border bg-secondary/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Before
        </p>
        <div className="mt-2">
          <AuditFieldRows data={entry.before_data} emptyLabel="—" />
        </div>
      </div>
      <div className="rounded-md border border-border bg-secondary/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          After
        </p>
        <div className="mt-2">
          <AuditFieldRows data={entry.after_data} emptyLabel="—" />
        </div>
      </div>
    </div>
  );
}

export function AuditTrail() {
  const { user } = useSession();
  const auditLogs = useQuery(auditLogsQuery(user?.id));
  const [actionFilter, setActionFilter] = useState<AuditActionFilter>("all");

  const filteredLogs = useMemo(() => {
    const rows = auditLogs.data ?? [];
    if (actionFilter === "all") return rows;
    return rows.filter((entry) => entry.action.toUpperCase() === actionFilter);
  }, [actionFilter, auditLogs.data]);

  const totalEvents = auditLogs.data?.length ?? 0;
  const insertCount = (auditLogs.data ?? []).filter(
    (entry) => entry.action.toUpperCase() === "INSERT",
  ).length;
  const updateCount = (auditLogs.data ?? []).filter(
    (entry) => entry.action.toUpperCase() === "UPDATE",
  ).length;
  const touchedTables = new Set((auditLogs.data ?? []).map((entry) => entry.table_name)).size;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Audit events"
          value={totalEvents}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Inserts"
          value={insertCount}
          hint={`${updateCount} updates`}
          icon={<PlusCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Tables touched"
          value={touchedTables}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Audit trail</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Insert and update payloads are rendered as structured field views.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-plate">
          <Filter className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
          {ACTION_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActionFilter(filter.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                actionFilter === filter.id
                  ? "bg-brass/15 text-brass"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {auditLogs.isLoading ? (
          <LoadingRows rows={5} />
        ) : auditLogs.isError ? (
          <QueryError
            message={auditLogs.error instanceof Error ? auditLogs.error.message : undefined}
            onRetry={() => auditLogs.refetch()}
          />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title={
              actionFilter === "all"
                ? "No audit events yet"
                : `No ${actionFilter.toLowerCase()} events`
            }
            description="Administrative changes, message activity and record updates will appear here."
          />
        ) : (
          filteredLogs.map((entry) => (
            <article
              key={entry.id}
              className="rounded-lg border border-border bg-card p-5 shadow-plate"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-brass">{entry.table_name}</p>
                  <h3 className="mt-1 font-display text-base font-semibold capitalize">
                    {entry.action.replace(/_/g, " ").toLowerCase()}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {entry.actor_name ?? entry.actor_id ?? "System"} ·{" "}
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                  {entry.record_id ? (
                    <p className="mt-1 font-mono text-[0.65rem] text-muted-foreground/80">
                      record {entry.record_id}
                    </p>
                  ) : null}
                </div>
                <StatusPill value={entry.action.toLowerCase()} />
              </div>

              <div className="mt-4">
                <AuditChangeBody entry={entry} />
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
