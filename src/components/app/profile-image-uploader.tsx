import { useRef, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { uploadProfileImage } from "@/lib/imagekit";
import { profileQuery } from "@/lib/queries";
import { initials, useSession } from "@/lib/session";

export function ProfileImageUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { user } = useSession();
  const queryClient = useQueryClient();
  const profile = useQuery(profileQuery(user?.id));

  const avatarUrl = previewUrl ?? profile.data?.avatar_url ?? null;
  const label = initials(profile.data?.full_name ?? user?.email ?? null);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!user) return;

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploading(true);
    try {
      const uploadedUrl = await uploadProfileImage(file, user.id);
      setPreviewUrl(uploadedUrl);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["lawyers"] }),
      ]);
      toast.success("Profile photo updated");
    } catch (error) {
      setPreviewUrl(null);
      toast.error(error instanceof Error ? error.message : "Profile image upload failed");
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-8 w-8 overflow-hidden rounded-full bg-brass/10 ring-1 ring-brass/30">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[0.65rem] font-semibold text-muted-foreground">
            {label}
          </span>
        )}
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/40">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-background" />
          </span>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => void handleChange(event)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        Update photo
      </Button>
    </div>
  );
}
