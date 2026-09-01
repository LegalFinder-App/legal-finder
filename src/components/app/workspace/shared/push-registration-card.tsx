import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { pushSubscriptionsQuery } from "@/lib/queries";
import { subscribeBrowserPush, unsubscribeBrowserPush } from "@/lib/platform-notifications";

export function PushRegistrationCard({ userId }: { userId: string | undefined }) {
  const pushSubscriptions = useQuery(pushSubscriptionsQuery(userId));
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    setPushSupported(
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window,
    );
  }, []);

  const enablePush = async () => {
    if (!userId) return;
    try {
      await subscribeBrowserPush(userId);
      toast.success("Device registered for push notifications");
      pushSubscriptions.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to register device");
    }
  };

  const disablePush = async () => {
    if (!userId) return;
    try {
      await unsubscribeBrowserPush(userId);
      toast.success("Push notifications disabled for this device");
      pushSubscriptions.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to disable push");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-plate">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold">Device push registration</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {pushSubscriptions.data?.length
              ? `${pushSubscriptions.data.length} registered device(s) for this account.`
              : pushSupported
                ? "This device can be registered for push delivery."
                : "Push registration is unavailable in this browser."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void enablePush()}
            disabled={!pushSupported}
          >
            Register this device
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void disablePush()}>
            Remove device
          </Button>
        </div>
      </div>
    </div>
  );
}
