import { createFileRoute } from "@tanstack/react-router";
import { PlatformSettingsPanel } from "@/components/app/admin/platform-settings-panel";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "LegalFinder | Admin · Settings" }] }),
  component: PlatformSettingsPanel,
});
