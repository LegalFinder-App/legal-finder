import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  StatCard,
  StatusPill,
  EmptyState,
  LoadingRows,
  QueryError,
} from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lawyersQuery, lawyerCpdRecordsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

function CpdHoursBadge({ lawyerId }: { lawyerId: string }) {
  const cpd = useQuery(lawyerCpdRecordsQuery(lawyerId));
  const totalHours = (cpd.data ?? []).reduce((sum, r) => sum + Number(r.hours), 0);
  return <span className="text-xs text-muted-foreground">{totalHours}h CPD logged</span>;
}

function kycLabel(status: string | null | undefined, verified: boolean) {
  if (status === "expired") return "KYC expired";
  if (status === "pending") return "KYC pending";
  if (status === "rejected") return "KYC rejected";
  if (status === "verified" || verified) return "KYC verified";
  return "No KYC";
}

export function VerificationsPanel() {
  const queryClient = useQueryClient();
  const lawyers = useQuery(lawyersQuery());
  const [expiryDrafts, setExpiryDrafts] = useState<Record<string, string>>({});
  const [savingExpiryId, setSavingExpiryId] = useState<string | null>(null);

  const saveLicenseExpiry = async (lawyerId: string) => {
    const value = expiryDrafts[lawyerId];
    setSavingExpiryId(lawyerId);
    const { error } = await supabase
      .from("lawyers")
      .update({ bar_license_expires_at: value || null })
      .eq("id", lawyerId);
    setSavingExpiryId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("License expiry updated");
    queryClient.invalidateQueries({ queryKey: ["lawyers"] });
  };

  const pending =
    lawyers.data?.filter(
      (lawyer) => !lawyer.verified || lawyer.kyc_status === "pending" || lawyer.kyc_status === "expired",
    ).length ?? 0;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total advocates"
          value={lawyers.data?.length ?? 0}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Needs attention"
          value={pending}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Verified"
          value={lawyers.data?.filter((l) => l.verified).length ?? 0}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold">Advocate verification</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Directory “Verified” comes only from an approved application or practising-certificate
          renewal under{" "}
          <Link to="/admin/applications" className="text-brass hover:underline">
            Applications
          </Link>
          . One-click verify is disabled.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {lawyers.isLoading ? (
            <LoadingRows rows={4} />
          ) : lawyers.isError ? (
            <QueryError
              message={lawyers.error instanceof Error ? lawyers.error.message : undefined}
              onRetry={() => lawyers.refetch()}
            />
          ) : (lawyers.data ?? []).length === 0 ? (
            <EmptyState
              title="No advocates on file"
              description="Advocate profiles will appear here once they are created."
            />
          ) : (
            (lawyers.data ?? []).map((lawyer) => (
              <div key={lawyer.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
                    {lawyer.photo_url ? (
                      <img src={lawyer.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                        {lawyer.full_name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase() ?? "")
                          .join("")}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-display font-semibold">{lawyer.full_name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {lawyer.firm ?? "Independent"}
                        </p>
                      </div>
                      <StatusPill value={lawyer.verified ? "active" : "pending"} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {lawyer.bar_number ?? "Bar number pending"}
                      {lawyer.county ? ` · ${lawyer.county}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusPill value={lawyer.license_status} />
                      <span className="text-xs text-muted-foreground">
                        {kycLabel(lawyer.kyc_status, lawyer.verified)}
                        {lawyer.kyc_expires_at || lawyer.bar_license_expires_at
                          ? ` · PC ${lawyer.kyc_expires_at ?? lawyer.bar_license_expires_at}`
                          : ""}
                      </span>
                      <CpdHoursBadge lawyerId={lawyer.id} />
                    </div>
                    <div className="mt-3 flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">License expiry</label>
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          value={
                            expiryDrafts[lawyer.id] ??
                            lawyer.bar_license_expires_at?.slice(0, 10) ??
                            ""
                          }
                          onChange={(event) =>
                            setExpiryDrafts((prev) => ({
                              ...prev,
                              [lawyer.id]: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingExpiryId === lawyer.id}
                        onClick={() => void saveLicenseExpiry(lawyer.id)}
                      >
                        Save
                      </Button>
                    </div>
                    <div className="mt-4">
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/admin/applications">Review in Applications</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
