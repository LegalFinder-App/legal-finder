import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AuthHandoff } from "@/components/auth/auth-handoff";
import { Button } from "@/components/ui/button";
import { clearAuthHandoff, markAuthHandoff } from "@/lib/auth-handoff";

/**
 * Legacy holding URL. SSO no longer parks here — any visit immediately continues to
 * /dashboard so bookmarks / old redirects cannot trap people on a spinner.
 */
export const Route = createFileRoute("/opening")({
  ssr: false,
  head: () => ({
    meta: [{ title: "LegalFinder | Opening your workspace" }, { name: "robots", content: "noindex" }],
  }),
  component: OpeningPage,
});

function OpeningPage() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    markAuthHandoff();
    window.location.replace("/dashboard");
    const timer = window.setTimeout(() => setStuck(true), 5_000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AuthHandoff
      title={stuck ? "Almost there" : "Opening your workspace"}
      detail={
        stuck
          ? "Tap below if your workspace did not open."
          : "You’re signed in. Taking you to your account now."
      }
      action={
        stuck ? (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full"
              onClick={() => {
                markAuthHandoff();
                window.location.replace("/dashboard");
              }}
            >
              Open workspace
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12 w-full"
              onClick={() => {
                clearAuthHandoff();
                window.location.assign("/auth");
              }}
            >
              Back to sign in
            </Button>
          </div>
        ) : null
      }
    />
  );
}
