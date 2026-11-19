import { useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { REPORT_REASONS, reportContent } from "@/lib/moderation";
import type { ReportReason, ReportTargetType } from "@/integrations/supabase/app-database";

export type ReportTarget = {
  type: ReportTargetType;
  id: string;
  label: string;
};

export function ReportDialog({
  open,
  target,
  reporterId,
  onClose,
}: {
  open: boolean;
  target: ReportTarget | null;
  reporterId: string | undefined;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason>("harassment");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!target || !reporterId) return;
    setSubmitting(true);
    try {
      await reportContent({
        reporterId,
        targetType: target.type,
        targetId: target.id,
        reason,
        details,
      });
      toast.success("Report sent", {
        description: "Our team reviews reports within 24 hours.",
      });
      setDetails("");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send the report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {target?.label ?? "content"}</DialogTitle>
          <DialogDescription>
            Tell us what is wrong. We copy the reported text from our records — you do not need to
            paste it again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="report-reason">Reason</Label>
            <select
              id="report-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportReason)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-details">Details (optional)</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Anything else we should know…"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="brass" onClick={() => void submit()} disabled={submitting}>
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
