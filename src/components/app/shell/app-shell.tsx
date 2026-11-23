import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { CommandPalette } from "./command-palette";

/** Collapse the app nav on Counsellor so chat + rails fit on 13–15" laptops. */
function CollapseNavOnCounsellor() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setOpen, isMobile } = useSidebar();
  useEffect(() => {
    if (isMobile) return;
    if (pathname === "/assistant" || pathname.startsWith("/assistant/")) {
      setOpen(false);
    }
  }, [pathname, isMobile, setOpen]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <SidebarProvider>
      <CollapseNavOnCounsellor />
      <AppSidebar />
      <SidebarInset className="min-h-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.05_262/0.04),transparent_55%),var(--background)]">
        <AppTopbar onOpenSearch={() => setSearchOpen(true)} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </SidebarInset>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}
