import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ProfileImageUploader } from "@/components/app/profile-image-uploader";
import { profileQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { initials, ROLE_LABELS, useSession } from "@/lib/session";

export function UserMenu() {
  const { user, primaryRole } = useSession();
  const profile = useQuery(profileQuery(user?.id));
  const navigate = useNavigate();

  const avatarUrl = profile.data?.avatar_url ?? null;
  const displayName = profile.data?.full_name ?? user?.email ?? "Account";
  const label = initials(profile.data?.full_name ?? user?.email ?? null);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 overflow-hidden rounded-full p-0"
          aria-label="Account menu"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-muted text-xs font-semibold text-muted-foreground">
              {label}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{displayName}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {ROLE_LABELS[primaryRole]} · {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <ProfileImageUploader />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="opacity-60">
          <UserIcon /> Profile settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()} className="text-destructive">
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
