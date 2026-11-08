import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Download, Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/app/shell/theme-toggle";
import { useSession, ROLE_HOME } from "@/lib/session";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useScrolled } from "@/hooks/use-scrolled";
import { cn } from "@/lib/utils";
import { delay } from "@/lib/motion";

const NAV = [
  { to: "/lawyers", label: "Advocates" },
  { to: "/advice", label: "Advice" },
  { to: "/judgements", label: "Judgements" },
  { to: "/updates", label: "Updates" },
  { to: "/library", label: "Library" },
  { to: "/news", label: "News" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const { user, primaryRole, loading } = useSession();
  const { canInstall, promptInstall } = usePwaInstall();
  const signedIn = !loading && !!user;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 pt-safe transition-[background-color,box-shadow,border-color] duration-300",
        "border-b border-transparent",
        scrolled &&
          "border-border/70 bg-background/75 shadow-xs backdrop-blur-xl backdrop-saturate-150",
      )}
    >
      <div className="container-page flex h-(--header-h) items-center gap-4">
        <Link
          to="/"
          className="press shrink-0 rounded-full text-foreground"
          aria-label="LegalFinder home"
        >
          <Logo />
        </Link>

        <nav aria-label="Main" className="mx-auto hidden lg:block">
          <ul className="flex items-center gap-0.5 rounded-full border border-border/70 bg-card/70 p-1 shadow-xs backdrop-blur">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="block whitespace-nowrap rounded-full px-2.5 py-1.5 text-[0.8125rem] font-medium xl:px-4 xl:text-[0.875rem] text-muted-foreground transition-colors duration-200 hover:text-foreground"
                  activeProps={{
                    className: "bg-primary !text-primary-foreground shadow-xs",
                    "aria-current": "page",
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:ml-0 lg:flex">
          <ThemeToggle />
          {canInstall && (
            <Button variant="ghost" size="sm" onClick={() => void promptInstall()}>
              <Download /> Install
            </Button>
          )}
          {signedIn ? (
            <Button asChild size="sm" className="shine">
              <Link to={ROLE_HOME[primaryRole]}>
                Open workspace <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="shine">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
              <div className="flex h-(--header-h) items-center border-b border-border px-5 pt-safe">
                <SheetTitle asChild>
                  <span>
                    <Logo />
                  </span>
                </SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </div>
              <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="grid gap-1">
                  {NAV.map((item, i) => (
                    <li key={item.to} className="animate-rise" style={delay(60 + i * 40)}>
                      <Link
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className="flex min-h-12 items-center justify-between rounded-2xl px-4 text-lg font-semibold tracking-tight text-foreground transition-colors hover:bg-secondary"
                        activeProps={{
                          className: "bg-secondary text-brass",
                          "aria-current": "page",
                        }}
                      >
                        {item.label}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="grid gap-2 border-t border-border p-4 pb-[calc(1rem+var(--safe-bottom))]">
                {canInstall && (
                  <Button variant="outline" size="lg" onClick={() => void promptInstall()}>
                    <Download /> Install app
                  </Button>
                )}
                {signedIn ? (
                  <Button asChild size="lg">
                    <Link to={ROLE_HOME[primaryRole]} onClick={() => setOpen(false)}>
                      Open workspace <ArrowRight />
                    </Link>
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" size="lg">
                      <Link to="/auth" onClick={() => setOpen(false)}>
                        Sign in
                      </Link>
                    </Button>
                    <Button asChild size="lg">
                      <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>
                        Get started
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
