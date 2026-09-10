import { useState, type ReactElement } from "react";
import { toast } from "@/lib/toast";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { draftDocumentSection } from "@/lib/document-drafting.functions";
import {
  DOCUMENT_TEMPLATE_LIST,
  DOCUMENT_TEMPLATES,
  type DocumentTemplateId,
} from "@/lib/documents/templates";
import { DraftedDocument } from "@/lib/documents/templates/drafted-document";
import { cn } from "@/lib/utils";

type Mode = "template" | "ai";

async function uploadGeneratedDocument({
  userId,
  caseId,
  fileName,
  element,
}: {
  userId: string;
  caseId: string;
  fileName: string;
  element: ReactElement;
}) {
  const { pdf } = await import("@react-pdf/renderer");
  // pdf() expects a react-pdf <Document> element specifically; every template's render() returns
  // exactly that, but the shared DocumentTemplate type keeps it as a plain ReactElement so this
  // module doesn't need a value/type import of @react-pdf/renderer at module scope.
  const blob = await pdf(element as Parameters<typeof pdf>[0]).toBlob();
  const storagePath = `${userId}/${Date.now()}-${fileName.replace(/[^\w.-]+/g, "_")}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, blob, { upsert: false, contentType: "application/pdf" });
  if (uploadError) throw uploadError;

  const { error: recordError } = await supabase.from("documents").insert({
    owner_id: userId,
    case_id: caseId,
    name: `${fileName}.pdf`,
    storage_path: storagePath,
    mime_type: "application/pdf",
    size_bytes: blob.size,
    category: "generated",
  });
  if (recordError) {
    await supabase.storage.from("documents").remove([storagePath]);
    throw recordError;
  }
}

function TemplateMode({
  userId,
  caseId,
  onGenerated,
}: {
  userId: string;
  caseId: string;
  onGenerated: () => void;
}) {
  const [templateId, setTemplateId] = useState<DocumentTemplateId>("retainer_agreement");
  const template = DOCUMENT_TEMPLATES[templateId];
  const [values, setValues] = useState<Record<string, string>>(
    template.defaultValues as Record<string, string>,
  );
  const [busy, setBusy] = useState(false);

  const selectTemplate = (id: DocumentTemplateId) => {
    setTemplateId(id);
    setValues(DOCUMENT_TEMPLATES[id].defaultValues as Record<string, string>);
  };

  const generate = async () => {
    const parsed = template.schema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Fill in the required fields first.");
      return;
    }
    setBusy(true);
    try {
      await uploadGeneratedDocument({
        userId,
        caseId,
        fileName: template.title,
        element: template.render(parsed.data as never),
      });
      toast.success(`${template.title} generated`);
      onGenerated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to generate document");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="template-select">Document type</Label>
        <Select value={templateId} onValueChange={(v) => selectTemplate(v as DocumentTemplateId)}>
          <SelectTrigger id="template-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TEMPLATE_LIST.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{template.description}</p>
      </div>

      {template.fields.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <Label htmlFor={`field-${field.name}`}>{field.label}</Label>
          {field.type === "textarea" ? (
            <Textarea
              id={`field-${field.name}`}
              rows={3}
              value={values[field.name] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
              placeholder={field.placeholder}
            />
          ) : (
            <Input
              id={`field-${field.name}`}
              type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
              value={values[field.name] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
              placeholder={field.placeholder}
            />
          )}
        </div>
      ))}

      <Button type="button" variant="brass" onClick={() => void generate()} disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Generate document
      </Button>
    </div>
  );
}

function AiMode({
  userId,
  caseId,
  onGenerated,
}: {
  userId: string;
  caseId: string;
  onGenerated: () => void;
}) {
  const [documentType, setDocumentType] = useState("");
  const [instructions, setInstructions] = useState("");
  const [draftText, setDraftText] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);

  const requestDraft = async () => {
    if (!documentType.trim() || !instructions.trim()) {
      toast.error("Describe the document type and what you need drafted.");
      return;
    }
    setDrafting(true);
    try {
      const result = await draftDocumentSection({
        data: {
          documentType: documentType.trim(),
          instructions: instructions.trim(),
          existingText: draftText.trim() || undefined,
        },
      });
      setDraftText(result.draftText);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Drafting failed");
    } finally {
      setDrafting(false);
    }
  };

  const save = async () => {
    if (!draftText.trim()) {
      toast.error("Draft the document first, or edit the text below.");
      return;
    }
    setSaving(true);
    try {
      await uploadGeneratedDocument({
        userId,
        caseId,
        fileName: documentType.trim() || "Drafted document",
        element: (
          <DraftedDocument title={documentType.trim() || "Drafted document"} bodyText={draftText} />
        ),
      });
      toast.success("Document saved");
      onGenerated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ai-doc-type">Document type</Label>
        <Input
          id="ai-doc-type"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          placeholder="e.g. Demand letter, settlement proposal"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ai-instructions">What should it say?</Label>
        <Textarea
          id="ai-instructions"
          rows={4}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Describe the facts, parties, and what you want the document to accomplish…"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => void requestDraft()}
        disabled={drafting}
      >
        {drafting && <Loader2 className="h-4 w-4 animate-spin" />}
        <Sparkles className="h-4 w-4" />
        {draftText ? "Revise draft" : "Draft with AI"}
      </Button>

      {draftText && (
        <div className="space-y-1.5">
          <Label htmlFor="ai-draft-text">Draft (edit before saving)</Label>
          <Textarea
            id="ai-draft-text"
            rows={10}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
          />
          <Button type="button" variant="brass" onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save as document
          </Button>
        </div>
      )}
    </div>
  );
}

export function DocumentGenerator({
  userId,
  caseId,
  onGenerated,
}: {
  userId: string;
  caseId: string;
  onGenerated: () => void;
}) {
  const [mode, setMode] = useState<Mode>("template");

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
        {(["template", "ai"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-sm px-3 py-2 text-sm font-medium transition-colors",
              mode === m
                ? "bg-card text-foreground shadow-plate"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "template" ? "From template" : "AI-assisted drafting"}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {mode === "template" ? (
          <TemplateMode userId={userId} caseId={caseId} onGenerated={onGenerated} />
        ) : (
          <AiMode userId={userId} caseId={caseId} onGenerated={onGenerated} />
        )}
      </div>
    </div>
  );
}
