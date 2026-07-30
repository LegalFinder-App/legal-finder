import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useSession, ROLE_LABELS } from "@/lib/session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: WorkspaceLayout,
});

const LINKS = [
  { to: "/dashboard", label: "Overview" },
  { to: "/messages", label: "Messages" },
  { to: "/assistant", label: "Assistant" },
  { to: "/practice", label: "Practice" },
  { to: "/precinct", label: "Precinct" },
  { to: "/bench", label: "Bench" },
  { to: "/admin", label: "Admin" },
] as const;

function WorkspaceLayout() {
  const { primaryRole, user } = useSession();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="surface-ink">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-ink-foreground">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-md px-3 py-2 text-sm text-ink-foreground/70 hover:bg-ink-foreground/10 hover:text-ink-foreground"
                activeProps={{ className: "text-brass bg-ink-foreground/10" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-ink-foreground/60 sm:block">
              {ROLE_LABELS[primaryRole]} · {user?.email}
            </span>
            <Button variant="outlineInk" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}