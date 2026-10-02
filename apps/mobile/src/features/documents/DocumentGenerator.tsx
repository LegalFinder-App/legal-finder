import { useState } from "react";
import { View } from "react-native";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Button,
  DateTimeField,
  ErrorState,
  Input,
  LoadingRows,
  Segmented,
  SelectField,
  Text,
} from "@/components/ui";
import { AiConsentGate } from "@/components/AiConsent";
import { api, type DocumentTemplateField } from "@/lib/api";
import { errorMessage, toast } from "@/lib/toast";

type Mode = "template" | "ai";

// The templates (and the PDF layout behind them) live on the web server, so a template added
// there appears here without an app release.
const documentTemplatesQuery = queryOptions({
  queryKey: ["document-templates"],
  staleTime: 60 * 60_000,
  queryFn: async () => (await api.documentTemplates()).templates,
});

// Date fields hold the same "YYYY-MM-DD" text the web's date input produces, so a document reads
// the same wherever it was generated.
function toDay(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function fromDay(day: string | undefined) {
  if (!day) return null;
  const date = new Date(`${day}T00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function TemplateField({
  field,
  value,
  onChange,
}: {
  field: DocumentTemplateField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "date") {
    return (
      <View style={{ gap: 4 }}>
        <DateTimeField
          label={field.label}
          mode="date"
          value={fromDay(value)}
          onChange={(date) => onChange(toDay(date))}
        />
        {field.optional && value ? (
          <Button
            title="Clear date"
            variant="ghost"
            size="sm"
            onPress={() => onChange("")}
            style={{ alignSelf: "flex-start" }}
          />
        ) : null}
      </View>
    );
  }
  return (
    <Input
      label={field.label}
      value={value}
      onChangeText={onChange}
      placeholder={field.placeholder}
      multiline={field.type === "textarea"}
      keyboardType={field.type === "number" ? "decimal-pad" : "default"}
      maxLength={5000}
    />
  );
}

function TemplateMode({
  caseId,
  onGenerated,
}: {
  caseId: string | undefined;
  onGenerated: () => void;
}) {
  const templates = useQuery(documentTemplatesQuery);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (templates.isLoading) return <LoadingRows rows={4} height={56} />;
  if (templates.isError || !templates.data?.length) {
    return (
      <ErrorState
        message={
          templates.isError
            ? errorMessage(templates.error, "Couldn't load the document templates")
            : "No document templates are available right now."
        }
        onRetry={() => void templates.refetch()}
      />
    );
  }

  const template = templates.data.find((t) => t.id === templateId) ?? templates.data[0];

  const generate = async () => {
    const missing = template.fields.find((f) => !f.optional && !(values[f.name] ?? "").trim());
    if (missing) {
      toast.error(`${missing.label} is required.`);
      return;
    }
    setBusy(true);
    try {
      await api.generateDocument({ kind: "template", caseId, templateId: template.id, values });
      toast.success(`${template.title} generated`);
      onGenerated();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't generate the document"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <View>
        <SelectField
          label="Document type"
          value={template.id}
          onChange={(id) => {
            setTemplateId(id);
            setValues({});
          }}
          options={templates.data.map((t) => ({ value: t.id, label: t.title }))}
        />
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          {template.description}
        </Text>
      </View>

      {template.fields.map((field) => (
        <TemplateField
          key={`${template.id}:${field.name}`}
          field={field}
          value={values[field.name] ?? ""}
          onChange={(value) => setValues((prev) => ({ ...prev, [field.name]: value }))}
        />
      ))}

      <Button title="Generate document" loading={busy} onPress={() => void generate()} fullWidth />
    </View>
  );
}

function AiMode({ caseId, onGenerated }: { caseId: string | undefined; onGenerated: () => void }) {
  const { colors } = useTheme();
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
      const result = await api.draftDocument({
        documentType: documentType.trim(),
        instructions: instructions.trim(),
        existingText: draftText.trim() || undefined,
      });
      setDraftText(result.draftText);
    } catch (error) {
      toast.error(errorMessage(error, "Drafting failed"));
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
      await api.generateDocument({
        kind: "draft",
        caseId,
        title: documentType.trim() || "Drafted document",
        bodyText: draftText,
      });
      toast.success("Document saved");
      onGenerated();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save the document"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Input
        label="Document type"
        value={documentType}
        onChangeText={setDocumentType}
        placeholder="e.g. Demand letter, settlement proposal"
        maxLength={100}
      />
      <Input
        label="What should it say?"
        value={instructions}
        onChangeText={setInstructions}
        placeholder="Describe the facts, parties, and what you want the document to accomplish…"
        multiline
        maxLength={4000}
      />
      <Button
        title={draftText ? "Revise draft" : "Draft with AI"}
        variant="outline"
        icon={<Sparkles size={16} color={colors.foreground} />}
        loading={drafting}
        onPress={() => void requestDraft()}
        fullWidth
      />
      {drafting ? (
        <Text variant="small" tone="muted" align="center">
          Drafting — this can take up to a minute.
        </Text>
      ) : null}

      {draftText ? (
        <>
          <Input
            label="Draft (edit before saving)"
            value={draftText}
            onChangeText={setDraftText}
            multiline
            maxLength={20000}
            style={{ minHeight: 260 }}
          />
          <Button
            title="Save as document"
            loading={saving}
            disabled={drafting}
            onPress={() => void save()}
            fullWidth
          />
        </>
      ) : null}
    </View>
  );
}

/**
 * The app's counterpart of the web's DocumentGenerator: fill in a template, or draft with AI, and
 * the server renders the PDF and files it in the document vault (api.generateDocument).
 */
export function DocumentGenerator({
  caseId,
  onGenerated,
}: {
  caseId: string | undefined;
  onGenerated: () => void;
}) {
  const [mode, setMode] = useState<Mode>("template");

  return (
    <View style={{ gap: 16 }}>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "template", label: "From template" },
          { value: "ai", label: "AI-assisted drafting" },
        ]}
      />
      {/* Both stay mounted so switching tabs doesn't throw away what was typed in the other. */}
      <View style={mode === "template" ? undefined : { display: "none" }}>
        <TemplateMode caseId={caseId} onGenerated={onGenerated} />
      </View>
      <View style={mode === "ai" ? undefined : { display: "none" }}>
        <AiConsentGate onDecline={() => setMode("template")}>
          <AiMode caseId={caseId} onGenerated={onGenerated} />
        </AiConsentGate>
      </View>
    </View>
  );
}
