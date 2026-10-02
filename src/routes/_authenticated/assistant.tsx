import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { AiConsentGate } from "@/components/app/ai-consent";
import { AssistantWorkspace } from "@/components/app/assistant-workspace";
import { EmptyState } from "@/components/common/bits";
import { appSettingsQuery } from "@/lib/app-settings";
import { ROLE_HOME, useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: Page,
});

function Page() {
  const settings = useQuery(appSettingsQuery);
  const navigate = useNavigate();
  const { primaryRole } = useSession();

  if (settings.data && !settings.data.ai_assistant_enabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <EmptyState
          icon={<Sparkles className="h-8 w-8" />}
          title="The AI assistant is temporarily unavailable"
          description="This feature has been paused by an administrator."
        />
      </div>
    );
  }

  return (
    <AiConsentGate
      onDecline={() => void navigate({ to: ROLE_HOME[primaryRole] })}
      frameClassName="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8"
    >
      <AssistantWorkspace />
    </AiConsentGate>
  );
}
