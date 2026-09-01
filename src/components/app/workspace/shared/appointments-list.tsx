import { StatusPill, EmptyState, LoadingRows } from "@/components/common/bits";

export interface AppointmentLike {
  id: string;
  subject: string;
  scheduled_at: string;
  mode: string;
  status: string;
}

export function AppointmentsList({
  appointments,
  isLoading,
  emptyTitle = "Nothing scheduled",
  emptyDescription = "Book a consultation from any advocate profile.",
}: {
  appointments: AppointmentLike[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (isLoading) return <LoadingRows rows={3} />;
  if (appointments.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {appointments.map((a) => (
        <div key={a.id} className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display font-semibold">{a.subject}</p>
            <StatusPill value={a.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(a.scheduled_at).toLocaleString()} · {a.mode}
          </p>
        </div>
      ))}
    </div>
  );
}
