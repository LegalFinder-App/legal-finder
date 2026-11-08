import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/tanstack-react-start";
import { toast } from "@/lib/toast";
import { Loader2, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PushRegistrationCard } from "@/components/app/workspace/shared/push-registration-card";
import { AvatarUploadCard } from "@/components/app/settings/avatar-upload-card";
import { PasskeyManager } from "@/components/app/settings/passkey-manager";
import { PayoutDetailsCard } from "@/components/app/settings/payout-details-card";
import { profileQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { deleteOwnAccount } from "@/lib/account.functions";
import { useSession } from "@/lib/session";
import { useAiConsent } from "@/lib/ai-consent";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — LegalFinder" }] }),
  component: SettingsPage,
});

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function SettingsPage() {
  const { user, primaryRole } = useSession();
  const profile = useQuery(profileQuery(user?.id));
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const aiConsent = useAiConsent();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setFullName(profile.data?.full_name ?? "");
  }, [profile.data?.full_name]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteOwnAccount();
      toast.success("Account deleted");
      await signOut();
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete account");
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">Account</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage your profile, notifications, and appearance.
      </p>

      <section className="mt-10 card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Profile</h2>
        <div className="mt-4">
          <AvatarUploadCard
            userId={user?.id}
            avatarUrl={profile.data?.avatar_url}
            fullName={profile.data?.full_name}
            email={user?.email}
          />
        </div>
        <form onSubmit={saveProfile} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              maxLength={100}
              disabled={profile.isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground">
              Email and password are managed by your sign-in provider, not here.
            </p>
          </div>
          <Button type="submit" variant="brass" disabled={savingProfile}>
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </form>
      </section>

      {primaryRole === "lawyer" && (
        <section className="mt-8 card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Payout details</h2>
          <div className="mt-4">
            <PayoutDetailsCard lawyerUserId={user?.id} />
          </div>
        </section>
      )}

      <section className="mt-8 card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Passkeys</h2>
        <div className="mt-4">
          <PasskeyManager />
        </div>
      </section>

      <section className="mt-8 card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Register this device to receive push notifications for new messages and case updates.
        </p>
        <div className="mt-4">
          <PushRegistrationCard userId={user?.id} />
        </div>
      </section>

      <section className="mt-8 card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Privacy</h2>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="ai-features">AI features</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Let the legal assistant and AI-assisted drafting send what you type to Anthropic,
              which provides the AI model. Off: both ask again before they are used.
            </p>
          </div>
          <Switch
            id="ai-features"
            checked={aiConsent.allowed}
            disabled={aiConsent.loading}
            onCheckedChange={(on) => (on ? aiConsent.allow() : aiConsent.withdraw())}
          />
        </div>
      </section>

      <section className="mt-8 card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how LegalFinder looks on this device.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-sm font-medium transition-colors",
                theme === option.value
                  ? "border-brass bg-brass/10 text-accent-foreground"
                  : "border-border hover:bg-secondary",
              )}
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 card border-destructive/40 p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-destructive">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete your account and sign-in access. This cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="mt-4 text-destructive hover:text-destructive"
            >
              Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your sign-in account and removes you from Users &amp;
                roles. You'll be signed out immediately and won't be able to sign back in.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void handleDeleteAccount()}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting…" : "Delete account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
