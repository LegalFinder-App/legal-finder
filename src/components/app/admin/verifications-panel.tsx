import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export function VerificationsPanel() {
  const queryClient = useQueryClient();
  const lawyers = useQuery(lawyersQuery());
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
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

  const setVerification = async (lawyerId: string, verified: boolean) => {
    setVerifyingId(lawyerId);
    const { error } = await supabase.from("lawyers").update({ verified }).eq("id", lawyerId);
    setVerifyingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(verified ? "Advocate verified" : "Verification removed");
    queryClient.invalidateQueries({ queryKey: ["lawyers"] });
    queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  };

  const pending = lawyers.data?.filter((lawyer) => !lawyer.verified).length ?? 0;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total advocates"
          value={lawyers.data?.length ?? 0}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Pending verifications"
          value={pending}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Verified"
          value={(lawyers.data?.length ?? 0) - pending}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold">Advocate verification</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm bar credentials before advocates appear in the public directory.
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
                    <div className="mt-2 flex items-center gap-2">
                      <StatusPill value={lawyer.license_status} />
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      {!lawyer.verified ? (
                        <Button
                          size="sm"
                          variant="brass"
                          disabled={verifyingId === lawyer.id}
                          onClick={() => setVerification(lawyer.id, true)}
                        >
                          Verify advocate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={verifyingId === lawyer.id}
                          onClick={() => setVerification(lawyer.id, false)}
                        >
                          Revoke verification
                        </Button>
                      )}
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
