import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Gavel, Newspaper, Scale } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { navGroupsForRole } from "./nav-config";
import { adviceListQuery, judgementsQuery, newsListQuery, publicLawyersQuery } from "@/lib/queries";
import { useSession } from "@/lib/session";

/**
 * Client-side search over already-permitted reads, not a server-side full-text search.
 * Datasets load lazily (only while the palette is open) and cmdk fuzzy-filters what's rendered.
 * Open state is owned by AppShell so the Cmd/Ctrl+K shortcut and the topbar search button both work.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { primaryRole } = useSession();

  const lawyers = useQuery({ ...publicLawyersQuery(), enabled: open });
  const advice = useQuery({ ...adviceListQuery, enabled: open });
  const news = useQuery({ ...newsListQuery, enabled: open });
  const judgements = useQuery({ ...judgementsQuery, enabled: open });

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  const navItems = navGroupsForRole(primaryRole).flatMap((group) => group.items);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search advocates, advice, news, judgements…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Go to">
          {navItems.map((item) => (
            <CommandItem key={item.to} value={item.label} onSelect={() => go(item.to)}>
              <item.icon /> {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        {(lawyers.data ?? []).length > 0 && (
          <CommandGroup heading="Advocates">
            {(lawyers.data ?? []).slice(0, 8).map((lawyer) => (
              <CommandItem
                key={lawyer.id}
                value={`${lawyer.full_name} ${lawyer.firm ?? ""}`}
                onSelect={() => go(`/lawyers/${lawyer.id}`)}
              >
                <Scale /> {lawyer.full_name}
                {lawyer.firm && <span className="text-muted-foreground">· {lawyer.firm}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(advice.data ?? []).length > 0 && (
          <CommandGroup heading="Advice">
            {(advice.data ?? []).slice(0, 8).map((item) => (
              <CommandItem
                key={item.id}
                value={item.title}
                onSelect={() => go(`/advice/${item.slug ?? item.id}`)}
              >
                <BookOpen /> {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(news.data ?? []).length > 0 && (
          <CommandGroup heading="News">
            {(news.data ?? []).slice(0, 8).map((item) => (
              <CommandItem
                key={item.id}
                value={item.title}
                onSelect={() => go(`/news/${item.slug ?? item.id}`)}
              >
                <Newspaper /> {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(judgements.data ?? []).length > 0 && (
          <CommandGroup heading="Judgements">
            {(judgements.data ?? []).slice(0, 8).map((item) => (
              <CommandItem key={item.id} value={item.title} onSelect={() => go("/judgements")}>
                <Gavel /> {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
