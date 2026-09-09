import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, LoadingRows, StatusPill } from "@/components/common/bits";
import { supabase } from "@/integrations/supabase/client";
import { insertRow } from "@/lib/mutations";
import { myLawyerProfileQuery, lawyerCpdRecordsQuery } from "@/lib/queries";

export function CompliancePanel({ userId }: { userId: string | undefined }) {
  const queryClient = useQueryClient();
  const profile = useQuery(myLawyerProfileQuery(userId));
  const lawyerId = profile.data?.id;
  const cpdRecords = useQuery(lawyerCpdRecordsQuery(lawyerId));

  const [expiresAt, setExpiresAt] = useState("");
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [cpdTitle, setCpdTitle] = useState("");
  const [cpdHours, setCpdHours] = useState("");
  const [cpdDate, setCpdDate] = useState("");
  const [savingCpd, setSavingCpd] = useState(false);

  useEffect(() => {
    setExpiresAt(profile.data?.bar_license_expires_at?.slice(0, 10) ?? "");
  }, [profile.data?.bar_license_expires_at]);

  const saveExpiry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lawyerId) return;
    setSavingExpiry(true);
    try {
      const { error } = await supabase
        .from("lawyers")
        .update({ bar_license_expires_at: expiresAt || null })
        .eq("id", lawyerId);
      if (error) throw error;
      toast.success("License expiry updated");
      queryClient.invalidateQueries({ queryKey: ["my-lawyer-profile", userId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update license expiry");
    } finally {
      setSavingExpiry(false);
    }
  };

  const addCpdRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    const hours = Number(cpdHours);
    if (!lawyerId || !cpdTitle.trim() || !cpdDate || !(hours > 0)) return;
    setSavingCpd(true);
    try {
      await insertRow("lawyer_cpd_records", {
        lawyer_id: lawyerId,
        title: cpdTitle.trim(),
        hours,
        completed_on: cpdDate,
      });
      setCpdTitle("");
      setCpdHours("");
      setCpdDate("");
      toast.success("CPD entry logged");
      queryClient.invalidateQueries({ queryKey: ["lawyer-cpd-records", lawyerId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to log CPD entry");
    } finally {
      setSavingCpd(false);
    }
  };

  if (profile.isLoading) return <LoadingRows rows={2} />;

  if (!profile.data) {
    return (
      <EmptyState
        icon={<ShieldCheck className="h-8 w-8" />}
        title="No advocate profile on file"
        description="Ask an administrator to set up your advocate profile before tracking compliance."
      />
    );
  }

  const totalHours = (cpdRecords.data ?? []).reduce((sum, r) => sum + Number(r.hours), 0);

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display font-semibold">Bar license</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep your license expiry current — we'll remind you before it lapses.
            </p>
          </div>
          <StatusPill value={profile.data.license_status} />
        </div>
        <form onSubmit={saveExpiry} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="license-expiry">Expiry date</Label>
            <Input
              id="license-expiry"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" size="sm" disabled={savingExpiry}>
            Save
          </Button>
        </form>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display font-semibold">Continuing education (CPD)</p>
          <p className="text-sm text-muted-foreground">{totalHours} hour(s) logged</p>
        </div>

        <form
          onSubmit={addCpdRecord}
          className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
        >
          <div className="min-w-[10rem] flex-1 space-y-1.5">
            <Label htmlFor="cpd-title">Activity</Label>
            <Input
              id="cpd-title"
              value={cpdTitle}
              onChange={(event) => setCpdTitle(event.target.value)}
              placeholder="Continuing legal education seminar"
              required
            />
          </div>
          <div className="w-24 space-y-1.5">
            <Label htmlFor="cpd-hours">Hours</Label>
            <Input
              id="cpd-hours"
              type="number"
              min="0.5"
              step="0.5"
              value={cpdHours}
              onChange={(event) => setCpdHours(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cpd-date">Completed on</Label>
            <Input
              id="cpd-date"
              type="date"
              value={cpdDate}
              onChange={(event) => setCpdDate(event.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="brass" size="sm" disabled={savingCpd}>
            <Plus className="h-4 w-4" /> Log
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          {cpdRecords.isLoading ? (
            <LoadingRows rows={2} />
          ) : (cpdRecords.data ?? []).length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="h-8 w-8" />}
              title="No CPD hours logged yet"
              description="Log continuing education activities to keep a record of your compliance."
            />
          ) : (
            (cpdRecords.data ?? []).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div>
                  <p className="text-sm font-semibold">{record.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(record.completed_on).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-mono text-sm text-brass">{record.hours}h</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
