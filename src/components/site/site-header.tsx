import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useSession, ROLE_HOME } from "@/lib/session";

const NAV = [
  { to: "/lawyers", label: "Advocates" },
  { to: "/advice", label: "Advice" },
  { to: "/judgements", label: "Judgements" },
  { to: "/library", label: "Library" },
  { to: "/news", label: "News" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, primaryRole, loading } = useSession();

  return (
    <header className="sticky top-0 z-50 surface-ink border-b border-ink-foreground/10 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-ink-foreground">
          <Logo />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-foreground/70 transition-colors hover:bg-ink-foreground/10 hover:text-ink-foreground"
              activeProps={{ className: "text-brass bg-ink-foreground/10" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {!loading && user ? (
            <Button asChild variant="brass" size="sm">
              <Link to={ROLE_HOME[primaryRole]}>Open workspace</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="outlineInk" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild variant="brass" size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create account
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          className="ml-auto grid h-9 w-9 place-items-center rounded-md text-ink-foreground/80 hover:bg-ink-foreground/10 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-foreground/10 lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1 px-4 py-4 sm:px-6">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-ink-foreground/80 hover:bg-ink-foreground/10"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex gap-2">
              {user ? (
                <Button asChild variant="brass" className="flex-1">
                  <Link to={ROLE_HOME[primaryRole]} onClick={() => setOpen(false)}>
                    Open workspace
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outlineInk" className="flex-1">
                    <Link to="/auth" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                  <Button asChild variant="brass" className="flex-1">
                    <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>
                      Create account
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}