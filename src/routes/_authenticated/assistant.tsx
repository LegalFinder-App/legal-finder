import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AiConsentGate } from "@/components/app/ai-consent";
import { AssistantWorkspace } from "@/components/app/assistant-workspace";
import { EmptyState } from "@/components/common/bits";
import { CounsellorMark } from "@/components/brand/counsellor-mark";
import { appSettingsQuery } from "@/lib/app-settings";
import { ROLE_HOME, useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "LegalFinder | Counsellor AI" }] }),
  component: Page,
});

function Page() {
  const settings = useQuery(appSettingsQuery);
  const navigate = useNavigate();
  const { primaryRole } = useSession();

  if (settings.data && !settings.data.ai_assistant_enabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <EmptyState
          icon={<CounsellorMark className="h-8 w-8 text-brass" />}
          title="Counsellor AI is temporarily unavailable"
          description="This feature has been paused by an administrator."
        />
      </div>
    );
  }

  return (
    <AiConsentGate
      onDecline={() => void navigate({ to: ROLE_HOME[primaryRole] })}
      frameClassName="flex min-h-0 w-full flex-1 items-center justify-center overflow-y-auto px-4 py-6 sm:py-8"
    >
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <AssistantWorkspace />
      </div>
    </AiConsentGate>
  );
}
