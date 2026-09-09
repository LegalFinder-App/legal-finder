import { useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadProfileImage } from "@/lib/imagekit";
import { initials } from "@/lib/session";

/** Larger avatar-upload control for the Settings page — same upload path as the account-menu
 * ProfileImageUploader, just sized for a dedicated Profile section instead of a dropdown. */
export function AvatarUploadCard({
  userId,
  avatarUrl,
  fullName,
  email,
}: {
  userId: string | undefined;
  avatarUrl: string | null | undefined;
  fullName: string | null | undefined;
  email: string | null | undefined;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const displayUrl = previewUrl ?? avatarUrl ?? null;
  const label = initials(fullName ?? email ?? null);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId) return;

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploading(true);
    try {
      const uploadedUrl = await uploadProfileImage(file, userId);
      setPreviewUrl(uploadedUrl);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile", userId] }),
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
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {displayUrl ? (
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
            {label}
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/40">
            <Loader2 className="h-6 w-6 animate-spin text-background" />
          </span>
        )}
      </div>
      <div>
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
          disabled={uploading || !userId}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {displayUrl ? "Change photo" : "Upload photo"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, or WebP. Up to 5 MB.</p>
      </div>
    </div>
  );
}
