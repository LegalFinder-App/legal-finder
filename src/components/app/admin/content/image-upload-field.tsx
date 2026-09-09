import { useRef, useState, type ChangeEvent } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { ControllerRenderProps } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadContentImage } from "@/lib/imagekit";

/** Image field for the admin content manager — uploads to ImageKit, form field just holds the URL. */
export function ImageUploadField({ rhfField }: { rhfField: ControllerRenderProps }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const value = (rhfField.value as string | null | undefined) ?? "";

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadContentImage(file);
      rhfField.onChange(url);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative h-24 w-24 overflow-hidden rounded-md border border-border bg-muted">
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => rhfField.onChange("")}
            aria-label="Remove image"
            className="absolute right-1 top-1 rounded-full bg-foreground/60 p-0.5 text-background hover:bg-foreground/80"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
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
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {value ? "Replace image" : "Upload image"}
        </Button>
      </div>
      <Input
        placeholder="Or paste an image URL"
        value={value}
        onChange={(event) => rhfField.onChange(event.target.value)}
        className="text-xs"
      />
    </div>
  );
}
