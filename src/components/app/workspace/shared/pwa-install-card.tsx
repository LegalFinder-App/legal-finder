import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function PwaInstallCard() {
  const { canInstall, promptInstall } = usePwaInstall();

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-plate">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold">Installable app shell</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Works as an installable app on Android, iPhone/iPad, and desktop browsers that support
            PWA installation.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void promptInstall()}
          disabled={!canInstall}
        >
          Install app
        </Button>
      </div>
    </div>
  );
}
