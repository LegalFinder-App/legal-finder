import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { appSettingsQuery } from "@/lib/app-settings";
import { useSession } from "@/lib/session";

/** Blocks its children with a maintenance message for everyone except admins. Used inside
 * PublicLayout and the authenticated shell — never on /auth, so an admin can always sign in. */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const settings = useQuery(appSettingsQuery);
  const { primaryRole, loading } = useSession();

  if (settings.data?.maintenance_mode && !loading && primaryRole !== "admin") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="eyebrow text-brass">Maintenance</p>
        <h1 className="font-display text-3xl font-semibold">LegalFinder is briefly offline</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          We're making some changes and will be back shortly. Thanks for your patience.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
