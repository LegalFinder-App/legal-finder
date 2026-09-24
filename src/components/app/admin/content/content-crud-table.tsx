import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";
import { toast } from "@/lib/toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, LoadingRows, QueryError, SectionHeading } from "@/components/common/bits";
import { insertRow, updateRow, deleteRow, type TableName } from "@/lib/mutations";
import { ImageUploadField } from "@/components/app/admin/content/image-upload-field";

export type CrudFieldType =
  "text" | "textarea" | "number" | "boolean" | "date" | "select" | "image";

export interface CrudField {
  name: string;
  label: string;
  type: CrudFieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface CrudColumn {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
}

export interface ContentCrudConfig {
  table: TableName;
  title: string;
  description: string;
  queryKey: readonly unknown[];
  queryFn: () => Promise<Record<string, unknown>[]>;
  schema: ZodTypeAny;
  fields: CrudField[];
  columns: CrudColumn[];
  defaultValues: Record<string, unknown>;
  rowTitle: (row: Record<string, unknown>) => string;
}

/** Generic list + create/edit/delete UI driven by a per-table config — see `configs/` for the 8 CMS tables. */
export function ContentCrudTable({ config }: { config: ContentCrudConfig }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: config.queryKey, queryFn: config.queryFn });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);

  // Config-driven admin form: field set and validation vary per table, so the values shape can't be a fixed generic here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    resolver: zodResolver(config.schema),
    defaultValues: config.defaultValues,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: config.queryKey });

  const openCreate = () => {
    setEditingRow(null);
    form.reset(config.defaultValues);
    setDialogOpen(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditingRow(row);
    form.reset(row);
    setDialogOpen(true);
  };

  const onSubmit = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (editingRow) {
        await updateRow(config.table, String(editingRow.id), values as never);
        toast.success(`${config.title} updated`);
      } else {
        await insertRow(config.table, values as never);
        toast.success(`${config.title} created`);
      }
      setDialogOpen(false);
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: Record<string, unknown>) => {
    try {
      await deleteRow(config.table, String(row.id));
      toast.success(`${config.title} deleted`);
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  };

  const rows = query.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading title={config.title} description={config.description} />
        <Button type="button" variant="brass" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      <div className="mt-6">
        {query.isLoading ? (
          <LoadingRows rows={5} />
        ) : query.isError ? (
          <QueryError
            message={query.error instanceof Error ? query.error.message : undefined}
            onRetry={() => query.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={`No ${config.title.toLowerCase()} yet`}
            description="Create the first entry to publish it on the public site."
            action={
              <Button type="button" variant="outline" size="sm" onClick={openCreate}>
                Add the first one
              </Button>
            }
          />
        ) : (
          <div className="rounded-lg border border-border shadow-plate">
            <Table>
              <TableHeader>
                <TableRow>
                  {config.columns.map((col) => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={String(row.id)}>
                    {config.columns.map((col) => (
                      <TableCell key={col.key}>
                        {col.render ? col.render(row) : formatCell(row[col.key])}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(row)}
                          aria-label={`Edit ${config.rowTitle(row)}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${config.rowTitle(row)}`}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{config.rowTitle(row)}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes it permanently and it will disappear from the public
                                site immediately.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void onDelete(row)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRow ? `Edit ${config.title}` : `New ${config.title}`}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {config.fields.map((field) => (
                <FormField
                  key={field.name}
                  control={form.control}
                  name={field.name}
                  render={({ field: rhfField }) => (
                    <FormItem>
                      <FormLabel>{field.label}</FormLabel>
                      <FormControl>{renderInput(field, rhfField)}</FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="brass" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatCell(value: unknown): ReactNode {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
  }
  return String(value);
}

function renderInput(field: CrudField, rhfField: ControllerRenderProps) {
  switch (field.type) {
    case "image":
      return <ImageUploadField rhfField={rhfField} />;
    case "textarea":
      return (
        <Textarea
          rows={6}
          placeholder={field.placeholder}
          {...rhfField}
          value={(rhfField.value as string | null | undefined) ?? ""}
        />
      );
    case "boolean":
      return (
        <div>
          <Switch
            checked={Boolean(rhfField.value)}
            onCheckedChange={rhfField.onChange}
            ref={rhfField.ref}
          />
        </div>
      );
    case "number":
      return (
        <Input
          type="number"
          placeholder={field.placeholder}
          {...rhfField}
          value={(rhfField.value as number | string | null | undefined) ?? ""}
        />
      );
    case "date":
      return (
        <Input
          type="date"
          {...rhfField}
          value={((rhfField.value as string | null | undefined) ?? "").slice(0, 10)}
        />
      );
    case "select":
      return (
        <Select
          value={(rhfField.value as string | null | undefined) ?? undefined}
          onValueChange={rhfField.onChange}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    default:
      return (
        <Input
          placeholder={field.placeholder}
          {...rhfField}
          value={(rhfField.value as string | null | undefined) ?? ""}
        />
      );
  }
}
