import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingRows, StatusPill } from "@/components/common/bits";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_DOCUMENTS } from "@/lib/demo-data";
import { getEmptyStateMedia, siteMediaQuery } from "@/lib/site-media";

export interface DocumentLike {
  id: string;
  name: string;
  category: string;
  size_bytes: number;
  created_at: string;
  href?: string;
  case_id?: string | null;
}

export interface DocumentRowLike {
  id: string;
  name: string;
  category: string;
  size_bytes: number | null;
  created_at: string;
  case_id?: string | null;
}

export function DocumentVault({
  userId,
  caseId,
  documents,
  isLoading,
  allowDemoFallback = false,
  description = "Store pleadings, evidence and correspondence in your secure vault.",
}: {
  userId: string | undefined;
  /** When set, new uploads through this vault are tied to this case. */
  caseId?: string;
  documents: DocumentRowLike[];
  isLoading?: boolean;
  allowDemoFallback?: boolean;
  description?: string;
}) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const siteMedia = useQuery(siteMediaQuery);
  const emptyMedia = siteMedia.data
    ? getEmptyStateMedia(siteMedia.data, "empty-state-library")
    : undefined;

  const normalizedDocuments: DocumentLike[] = documents.map((document) => ({
    ...document,
    size_bytes: document.size_bytes ?? 0,
  }));

  const rows =
    normalizedDocuments.length > 0 ? normalizedDocuments : allowDemoFallback ? DEMO_DOCUMENTS : [];

  const uploadDocument = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !userId) return;

    setUploading(true);
    const storagePath = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });

    if (uploadError) {
      setUploading(false);
      toast.error(uploadError.message || "Upload failed");
      return;
    }

    const { error: recordError } = await supabase.from("documents").insert({
      owner_id: userId,
      case_id: caseId ?? null,
      name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
      category: "general",
    });
    setUploading(false);

    if (recordError) {
      await supabase.storage.from("documents").remove([storagePath]);
      toast.error(recordError.message);
      return;
    }

    toast.success("Document uploaded");
    queryClient.invalidateQueries({ queryKey: ["documents", userId] });
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Document vault</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="file"
            className="hidden"
            disabled={uploading || !userId}
            onChange={(event) => void uploadDocument(event.target.files)}
          />
          <Button variant="outline" size="sm" disabled={uploading} asChild>
            <span>
              <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload file"}
            </span>
          </Button>
        </label>
      </div>
      <div className="mt-4 space-y-3">
        {isLoading ? (
          <LoadingRows rows={3} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            imageUrl={emptyMedia?.image_url}
            imageAlt={emptyMedia?.alt_text}
            title="No documents yet"
            description="Upload filings, contracts or evidence to keep them with your matters."
          />
        ) : (
          rows.map((document) => (
            <div key={document.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display font-semibold">{document.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground capitalize">
                    {document.category} ·{" "}
                    {document.size_bytes
                      ? `${Math.max(1, Math.round(document.size_bytes / 1024))} KB`
                      : "Size unknown"}
                  </p>
                </div>
                <StatusPill value="active" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Added {new Date(document.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
