import { Link } from "@tanstack/react-router";
import { StatusPill, EmptyState, LoadingRows } from "@/components/common/bits";

export interface MatterLike {
  id: string;
  reference: string;
  title: string;
  status: string;
  case_type: string;
  court: string | null;
}

export function MattersList({
  cases,
  isLoading,
  emptyTitle = "No matters yet",
  emptyDescription = "Cases you're party to will appear here.",
}: {
  cases: MatterLike[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (isLoading) return <LoadingRows rows={3} />;
  if (cases.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {cases.map((c) => (
        <Link
          key={c.id}
          to="/cases/$caseId"
          params={{ caseId: c.id }}
          className="block card card-interactive p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs text-brass">{c.reference}</p>
            <StatusPill value={c.status} />
          </div>
          <p className="mt-2 font-display font-semibold">{c.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {c.case_type} · {c.court ?? "Court to be assigned"}
          </p>
        </Link>
      ))}
    </div>
  );
}
