import { useState } from "react";
import { Pressable, View } from "react-native";
import { showAlert } from "@/lib/alert";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Button,
  Card,
  DateTimeField,
  EmptyState,
  ErrorState,
  Input,
  LoadingRows,
  SelectField,
  Sheet,
  StatusPill,
  SwitchField,
  Text,
} from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { pickImage, uploadImage } from "@/lib/images";
import { mediaUrl } from "@/lib/media";
import { errorMessage, toast } from "@/lib/toast";
import type { ContentConfig, ContentField } from "./configs";

type RowData = Record<string, unknown>;

// Content tables share one untyped path, like the web's mutations.ts untypedClient.
const db = supabase as unknown as {
  from: (table: string) => {
    select: (c: string) => {
      order: (
        col: string,
        o: { ascending: boolean; nullsFirst?: boolean },
      ) => Promise<{ data: RowData[] | null; error: { message: string } | null }>;
    };
    insert: (v: RowData) => Promise<{ error: { message: string } | null }>;
    update: (v: RowData) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
    delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
  };
};

function normalize(fields: ContentField[], values: RowData): RowData {
  const out: RowData = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.type === "number") out[f.name] = v === "" || v == null ? null : Number(v);
    else if (f.type === "date") out[f.name] = v ? String(v) : null;
    else if (f.type === "boolean") out[f.name] = Boolean(v);
    else
      out[f.name] = typeof v === "string" ? (v.trim() === "" && !f.required ? null : v.trim()) : v;
  }
  return out;
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    const asset = await pickImage().catch(() => null);
    if (!asset) return;
    setBusy(true);
    try {
      onChange(await uploadImage(asset, "content"));
    } catch (error) {
      toast.error(errorMessage(error, "Image upload failed"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <Text variant="small" style={{ fontFamily: "PublicSans_500Medium" }}>
        {label}
      </Text>
      {value ? (
        <Image
          source={{ uri: mediaUrl(value) ?? undefined }}
          style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 10 }}
          contentFit="cover"
        />
      ) : null}
      <Button
        title={value ? "Replace image" : "Choose image"}
        variant="outline"
        size="sm"
        loading={busy}
        icon={<ImagePlus size={14} color={colors.foreground} />}
        onPress={() => void pick()}
        style={{ alignSelf: "flex-start" }}
      />
    </View>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ContentField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <Input label={field.label} value={String(value ?? "")} onChangeText={onChange} multiline />
      );
    case "number":
      return (
        <Input
          label={field.label}
          value={value == null ? "" : String(value)}
          onChangeText={onChange}
          keyboardType="decimal-pad"
        />
      );
    case "boolean":
      return <SwitchField label={field.label} value={Boolean(value)} onChange={onChange} />;
    case "select":
      return (
        <SelectField
          label={field.label}
          value={(value as string) ?? null}
          onChange={onChange}
          options={field.options ?? []}
        />
      );
    case "date":
      return (
        <DateTimeField
          label={field.label}
          mode="date"
          value={value ? new Date(String(value)) : null}
          onChange={(d) => onChange(d.toISOString().slice(0, 10))}
        />
      );
    case "image":
      return <ImageField label={field.label} value={String(value ?? "")} onChange={onChange} />;
    default:
      return (
        <Input
          label={field.label}
          value={String(value ?? "")}
          onChangeText={onChange}
          autoCapitalize={
            field.name === "slug" || field.name.endsWith("url") ? "none" : "sentences"
          }
        />
      );
  }
}

/** Native counterpart of the web's ContentCrudTable: list + create/edit/delete for one table. */
export function ContentManager({ config }: { config: ContentConfig }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const key = ["admin-content", config.table];
  const rows = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await db
        .from(config.table)
        .select("*")
        .order(config.orderBy.column, { ascending: config.orderBy.ascending, nullsFirst: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const [editing, setEditing] = useState<RowData | null>(null);
  const [values, setValues] = useState<RowData>(config.defaults);
  const [saving, setSaving] = useState(false);
  const isNew = editing !== null && !editing.id;

  const open = (row: RowData | null) => {
    setEditing(row ?? {});
    setValues(row ? { ...config.defaults, ...row } : config.defaults);
  };

  const save = async () => {
    const missing = config.fields.filter((f) => f.required && !String(values[f.name] ?? "").trim());
    if (missing.length)
      return toast.error(
        `${missing.map((f) => f.label).join(", ")} ${missing.length > 1 ? "are" : "is"} required`,
      );
    setSaving(true);
    const payload = normalize(config.fields, values);
    const { error } = isNew
      ? await db.from(config.table).insert(payload)
      : await db.from(config.table).update(payload).eq("id", String(editing!.id));
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isNew ? "Created" : "Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: key });
  };

  const remove = (row: RowData) =>
    showAlert("Delete this entry?", config.titleOf(row), [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await db.from(config.table).delete().eq("id", String(row.id));
          if (error) return toast.error(error.message);
          toast.success("Deleted");
          qc.invalidateQueries({ queryKey: key });
        },
      },
    ]);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text variant="small" tone="muted" style={{ flex: 1 }}>
          {config.description}
        </Text>
        <Button
          title="New"
          size="sm"
          icon={<Plus size={14} color={colors.brassForeground} />}
          onPress={() => open(null)}
        />
      </View>
      {rows.isLoading ? (
        <LoadingRows rows={3} />
      ) : rows.isError ? (
        <ErrorState message={(rows.error as Error).message} onRetry={() => void rows.refetch()} />
      ) : (rows.data ?? []).length === 0 ? (
        <EmptyState title={`No ${config.title.toLowerCase()} yet`} />
      ) : (
        (rows.data ?? []).map((row) => (
          <Card
            key={String(row.id)}
            onPress={() => open(row)}
            accessibilityLabel={`Edit ${config.titleOf(row)}`}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {config.titleOf(row)}
                </Text>
                {config.subtitleOf?.(row) ? (
                  <Text variant="small" tone="muted" numberOfLines={1}>
                    {config.subtitleOf(row)}
                  </Text>
                ) : null}
              </View>
              {config.statusOf?.(row) ? <StatusPill value={config.statusOf(row)!} /> : null}
              <Pencil size={16} color={colors.mutedForeground} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete"
                hitSlop={10}
                onPress={() => remove(row)}
              >
                <Trash2 size={16} color={colors.destructive} />
              </Pressable>
            </View>
          </Card>
        ))
      )}

      <Sheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={isNew ? `New ${config.title.replace(/s$/, "").toLowerCase()}` : "Edit"}
      >
        {config.fields.map((f) => (
          <FieldInput
            key={f.name}
            field={f}
            value={values[f.name]}
            onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
          />
        ))}
        <Button
          title={isNew ? "Create" : "Save changes"}
          onPress={() => void save()}
          loading={saving}
          size="lg"
          fullWidth
        />
      </Sheet>
    </View>
  );
}
