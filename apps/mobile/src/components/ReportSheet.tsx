import { useState } from "react";
import { View } from "react-native";
import { Button, Chip, Input, Sheet, Text } from "@/components/ui";
import { useSession } from "@/lib/session";
import { REPORT_REASONS, reportContent } from "@/lib/moderation";
import { errorMessage, toast } from "@/lib/toast";
import type { ReportReason, ReportTargetType } from "@/types/app-database";

/** Report a message, a review or a person. Administrators are notified and review each report. */
export function ReportSheet({
  target,
  onClose,
}: {
  /** What is being reported; null keeps the sheet closed. `label` reads "this message", etc. */
  target: { type: ReportTargetType; id: string; label: string } | null;
  onClose: () => void;
}) {
  const { user } = useSession();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const close = () => {
    setReason(null);
    setDetails("");
    onClose();
  };

  const send = async () => {
    if (!target || !user || !reason) return;
    setSending(true);
    try {
      await reportContent({
        reporterId: user.id,
        targetType: target.type,
        targetId: target.id,
        reason,
        details,
      });
      toast.success("Report sent", {
        description: "Thank you. Our team reviews every report and acts on it.",
      });
      close();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't send the report"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      visible={target !== null}
      onClose={close}
      title={`Report ${target?.label ?? ""}`}
      description="Tell us what's wrong. The person won't know who reported them."
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {REPORT_REASONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={reason === option.value}
            onPress={() => setReason(option.value)}
          />
        ))}
      </View>
      <Input
        label="Anything else we should know? (optional)"
        value={details}
        onChangeText={setDetails}
        multiline
        maxLength={2000}
      />
      {!reason ? (
        <Text variant="small" tone="muted">
          Choose a reason to continue.
        </Text>
      ) : null}
      <Button
        title="Send report"
        variant="destructive"
        loading={sending}
        disabled={!reason}
        onPress={() => void send()}
        fullWidth
      />
    </Sheet>
  );
}
