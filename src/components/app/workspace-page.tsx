import { useQuery } from "@tanstack/react-query";
import { Briefcase, CalendarDays, FileText, Gavel, ShieldAlert, Users } from "lucide-react";
import { StatCard, StatusPill, EmptyState, LoadingRows } from "@/components/common/bits";
import { useSession, ROLE_LABELS } from "@/lib/session";
import {
  myCasesQuery,
  appointmentsQuery,
  documentsQuery,
  conversationsQuery,
  incidentReportsQuery,
  judgementsQuery,
  lawyersQuery,
} from "@/lib/queries";

export function WorkspacePage({ surface, title }: { surface: string; title: string }) {
  const { user, primaryRole } = useSession();
  const cases = useQuery(myCasesQuery(user?.id));
  const appts = useQuery(appointmentsQuery(user?.id));
  const docs = useQuery(documentsQuery(user?.id));
  const convos = useQuery(conversationsQuery(user?.id));
  const reports = useQuery({ ...incidentReportsQuery, enabled: surface === "precinct" });
  const judgements = useQuery({ ...judgementsQuery, enabled: surface === "bench" });
  const lawyers = useQuery({ ...lawyersQuery(), enabled: surface === "admin" });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">{ROLE_LABELS[primaryRole]} workspace</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{title}</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open matters" value={cases.data?.length ?? 0} icon={<Briefcase className="h-4 w-4" />} />
        <StatCard label="Appointments" value={appts.data?.length ?? 0} icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard label="Documents" value={docs.data?.length ?? 0} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Conversations" value={convos.data?.length ?? 0} icon={<Users className="h-4 w-4" />} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-xl font-semibold">Matters</h2>
          <div className="mt-4 space-y-3">
            {cases.isLoading ? (
              <LoadingRows rows={3} />
            ) : (cases.data ?? []).length === 0 ? (
              <EmptyState title="No matters yet" description="Cases you're party to will appear here." />
            ) : (
              (cases.data ?? []).map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs text-brass">{c.reference}</p>
                    <StatusPill value={c.status} />
                  </div>
                  <p className="mt-2 font-display font-semibold">{c.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.case_type} · {c.court ?? "Court to be assigned"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">Upcoming appointments</h2>
          <div className="mt-4 space-y-3">
            {(appts.data ?? []).length === 0 ? (
              <EmptyState title="Nothing scheduled" description="Book a consultation from any advocate profile." />
            ) : (
              (appts.data ?? []).map((a) => (
                <div key={a.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display font-semibold">{a.subject}</p>
                    <StatusPill value={a.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(a.scheduled_at).toLocaleString()} · {a.mode}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {surface === "precinct" && (
          <section className="lg:col-span-2">
            <h2 className="font-display text-xl font-semibold">Incident reports</h2>
            <div className="mt-4 space-y-3">
              {(reports.data ?? []).length === 0 ? (
                <EmptyState icon={<ShieldAlert className="h-8 w-8" />} title="No reports in the queue" />
              ) : (
                (reports.data ?? []).map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-xs text-brass">{r.reference}</p>
                      <StatusPill value={r.status} />
                    </div>
                    <p className="mt-2 text-sm capitalize">{r.category}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {surface === "bench" && (
          <section className="lg:col-span-2">
            <h2 className="font-display text-xl font-semibold">Published judgements</h2>
            <div className="mt-4 space-y-3">
              {(judgements.data ?? []).length === 0 ? (
                <EmptyState icon={<Gavel className="h-8 w-8" />} title="No judgements published" />
              ) : (
                (judgements.data ?? []).map((j) => (
                  <div key={j.id} className="rounded-lg border border-border bg-card p-5">
                    <p className="font-mono text-xs text-brass">{j.case_number}</p>
                    <p className="mt-1 font-display font-semibold">{j.title}</p>
                    <p className="text-sm text-muted-foreground">{j.court}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {surface === "admin" && (
          <section className="lg:col-span-2">
            <h2 className="font-display text-xl font-semibold">Advocate verification</h2>
            <div className="mt-4 space-y-3">
              {(lawyers.data ?? []).map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-5"
                >
                  <div>
                    <p className="font-display font-semibold">{l.full_name}</p>
                    <p className="text-sm text-muted-foreground">{l.firm ?? "Independent"}</p>
                  </div>
                  <StatusPill value={l.verified ? "active" : "pending"} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}