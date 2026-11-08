import { useState } from "react";
import { useUser } from "@clerk/tanstack-react-start";
import { toast } from "@/lib/toast";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PasskeyManager() {
  const { user } = useUser();
  const [creating, setCreating] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const passkeys = user?.passkeys ?? [];

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      await user.createPasskey();
      toast.success("Passkey added", {
        description:
          "You can now sign in on this device with Face ID, Touch ID, or your fingerprint.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/not allowed|cancel/i.test(message)) {
        toast.error(message || "Unable to create passkey");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRemove = async (passkeyId: string) => {
    setRemovingId(passkeyId);
    try {
      const passkey = passkeys.find((p) => p.id === passkeyId);
      await passkey?.delete();
      toast.success("Passkey removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove passkey");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Add a passkey to sign in on this device with Face ID, Touch ID, Windows Hello, or your
        fingerprint — no password needed.
      </p>

      {passkeys.length > 0 && (
        <div className="mt-4 space-y-2">
          {passkeys.map((passkey) => (
            <div key={passkey.id} className="flex items-center justify-between gap-3 card p-3">
              <div className="flex items-center gap-2 min-w-0">
                <Fingerprint className="h-4 w-4 shrink-0 text-brass" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{passkey.name || "Passkey"}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {passkey.createdAt?.toLocaleDateString() ?? "recently"}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={removingId === passkey.id}
                onClick={() => void handleRemove(passkey.id)}
                aria-label={`Remove ${passkey.name || "passkey"}`}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        disabled={creating || !user}
        onClick={() => void handleCreate()}
      >
        {creating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Fingerprint className="h-4 w-4" />
        )}
        Add a passkey
      </Button>
    </div>
  );
}
