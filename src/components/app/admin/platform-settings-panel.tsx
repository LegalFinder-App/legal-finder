import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Switch } from "@/components/ui/switch";
import { QueryError, LoadingRows } from "@/components/common/bits";
import { appSettingsQuery, updateAppSettings, type AppSettings } from "@/lib/app-settings";
import { useSession } from "@/lib/session";

const TOGGLES: {
  key: keyof Pick<
    AppSettings,
    "maintenance_mode" | "incident_reporting_enabled" | "wanted_notices_enabled" | "ai_assistant_enabled"
  >;
  label: string;
  description: string;
  destructive?: boolean;
}[] = [
  {
    key: "maintenance_mode",
    label: "Maintenance mode",
    description:
      "Shows a maintenance page to every visitor and signed-in user except administrators. Use this during a deploy or incident.",
    destructive: true,
  },
  {
    key: "incident_reporting_enabled",
    label: "Incident reporting",
    description: "Lets the public submit incident reports from the Report an incident page.",
  },
  {
    key: "wanted_notices_enabled",
    label: "Wanted-person notices",
    description: "Shows the public Wanted persons directory and its listing pages.",
  },
  {
    key: "ai_assistant_enabled",
    label: "AI legal assistant",
    description: "Lets signed-in users open and use the AI-assisted chat feature.",
  },
];

export function PlatformSettingsPanel() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const settings = useQuery(appSettingsQuery);

  const toggle = async (key: (typeof TOGGLES)[number]["key"], value: boolean) => {
    if (!user) return;
    try {
      await updateAppSettings({ [key]: value }, user.id);
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Platform settings updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update settings");
    }
  };

  if (settings.isLoading) return <LoadingRows rows={4} />;
  if (settings.isError || !settings.data) {
    return (
      <QueryError
        message={settings.error instanceof Error ? settings.error.message : undefined}
        onRetry={() => settings.refetch()}
      />
    );
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold">Platform settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Site-wide toggles. Changes apply immediately for every visitor.
      </p>

      <div className="mt-6 space-y-3">
        {TOGGLES.map((item) => (
          <div
            key={item.key}
            className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-plate"
          >
            <div className="min-w-0">
              <p className={item.destructive ? "font-display font-semibold text-destructive" : "font-display font-semibold"}>
                {item.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
            <Switch
              checked={settings.data[item.key]}
              onCheckedChange={(value) => void toggle(item.key, value)}
            />
          </div>
        ))}
      </div>

      {settings.data.updated_by && (
        <p className="mt-4 text-xs text-muted-foreground">
          Last changed {new Date(settings.data.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
