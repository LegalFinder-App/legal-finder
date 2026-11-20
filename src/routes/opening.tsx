import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useClerk } from "@clerk/tanstack-react-start";
import { useQueryClient } from "@tanstack/react-query";
import { AuthHandoff } from "@/components/auth/auth-handoff";
import { Button } from "@/components/ui/button";
import {
  clientClerkUserId,
  finishAuthWithHardNav,
  waitForServerSession,
} from "@/lib/after-auth";
import { clearAuthHandoff, markAuthHandoff } from "@/lib/auth-handoff";
import { navigateAfterAuth } from "@/lib/rbac";

/**
 * Post-SSO holding page. Never paints the sign-in form. Clerk / Dashboard often bounce
 * unfinished OAuth through /auth or /dashboard; those routes send people here instead until
 * the cookie is live, then we hard-navigate once to the role home.
 */
export const Route = createFileRoute("/opening")({
  ssr: false,
  head: () => ({
    meta: [{ title: "LegalFinder | Opening your workspace" }, { name: "robots", content: "noindex" }],
  }),
  component: OpeningPage,
});

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

function OpeningPage() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  const ran = useRef(false);
  const [detail, setDetail] = useState("You’re signed in. Taking you to your account now.");
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    markAuthHandoff();
  }, []);

  useEffect(() => {
    if (!isLoaded || !clerk.loaded) return;
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      markAuthHandoff();
      setDetail("Confirming your secure session…");

      let id = userId ?? clientClerkUserId() ?? clerk.user?.id ?? clerk.session?.user?.id ?? null;
      if (!id) {
        const deadline = Date.now() + 10_000;
        while (Date.now() < deadline && !id) {
          id = clientClerkUserId() ?? clerk.user?.id ?? clerk.session?.user?.id ?? null;
          if (id) break;
          await sleep(100);
        }
      }

      if (!id && !isSignedIn) {
        // No session after waiting — only then offer a way back to sign-in.
        setStuck(true);
        setDetail("We couldn’t confirm your sign-in. You can try again.");
        return;
      }

      if (!id) {
        id = (await waitForServerSession(8_000)) ?? null;
      }

      if (!id) {
        setStuck(true);
        setDetail("Your session is taking longer than usual. Try opening your workspace again.");
        return;
      }

      setDetail("Opening your workspace…");
      // Retry cookie sync a few times before giving up — stay on this page (no /auth).
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await finishAuthWithHardNav({ queryClient, userId: id });
          return;
        } catch {
          setDetail("Still confirming your session…");
          await sleep(800);
        }
      }
      try {
        const serverId = await waitForServerSession(6_000);
        if (!serverId) throw new Error("no cookie");
        const home = await navigateAfterAuth(queryClient, serverId).catch(
          () => "/dashboard" as const,
        );
        markAuthHandoff();
        window.location.replace(home);
      } catch {
        setStuck(true);
        setDetail("Signed in, but we couldn’t open your workspace. Try again.");
      }
    })();
  }, [clerk, isLoaded, isSignedIn, queryClient, userId]);

  return (
    <AuthHandoff
      title={stuck ? "Almost there" : "Opening your workspace"}
      detail={detail}
      action={
        stuck ? (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full"
              onClick={() => {
                ran.current = false;
                setStuck(false);
                markAuthHandoff();
                window.location.reload();
              }}
            >
              Try again
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
