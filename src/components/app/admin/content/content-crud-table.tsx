import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";
import {
  ArrowDownUp,
  Copy,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmptyState, QueryError } from "@/components/common/bits";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { MarkdownLite } from "@/lib/markdown-lite";
import { insertRow, updateRow, deleteRow, type TableName } from "@/lib/mutations";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ImageUploadField } from "@/components/app/admin/content/image-upload-field";
import type { ContentType } from "./registry";

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

type Row = Record<string, unknown>;
type Status = "all" | "published" | "draft";
type SortKey = "title" | "date";

const PAGE_SIZE = 15;
// Long-form fields get the Write/Preview editor and the wide column.
const LONG_FORM = /^(body|content|description|summary|details|text|bio)$/;
const DATE_KEYS = ["updated_at", "published_at", "decided_on", "created_at"];
// Columns the duplicate action must not copy.
const SYSTEM_KEYS = ["id", "slug", "created_at", "updated_at", "published_at", "author_id"];

/**
 * The CMS engine behind every content type (configs/ + registry.ts): searchable, sortable,
 * paginated list with bulk actions, and a side-panel editor. Saves go through the same
 * insertRow/updateRow/deleteRow helpers as before, so RLS and the audit trail are unchanged.
 */
export function ContentCrudTable({
  config,
  type,
}: {
  config: ContentCrudConfig;
  type?: ContentType;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: config.queryKey, queryFn: config.queryFn });
  const singular = type?.singular ?? config.title.toLowerCase();
  const hasPublished = config.fields.some((f) => f.name === "published");
  const imageField = config.fields.find((f) => f.type === "image")?.name;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Row[] | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: config.queryKey });
    queryClient.invalidateQueries({ queryKey: ["admin-content-counts"] });
  };

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const counts = useMemo(
    () => ({
      all: rows.length,
      published: rows.filter((r) => r.published === true).length,
      draft: rows.filter((r) => r.published === false).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (status === "published" && row.published !== true) return false;
      if (status === "draft" && row.published !== false) return false;
      if (!term) return true;
      return Object.values(row).some(
        (v) => typeof v === "string" && v.toLowerCase().includes(term),
      );
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort.key === "title") return config.rowTitle(a).localeCompare(config.rowTitle(b)) * dir;
      return (rowDate(a) ?? "").localeCompare(rowDate(b) ?? "") * dir;
    });
  }, [rows, q, status, sort, config]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(visible, PAGE_SIZE);
  useEffect(() => setPage(1), [q, status, setPage]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "title" ? "asc" : "desc" },
    );

  const openCreate = (values?: Row) => {
    setEditingRow(values ? { ...values, __duplicate: true } : null);
    setEditorOpen(true);
  };
  const openEdit = (row: Row) => {
    setEditingRow(row);
    setEditorOpen(true);
  };
  const duplicate = (row: Row) => {
    const copy: Row = { ...row };
    for (const k of SYSTEM_KEYS) delete copy[k];
    const titleKey = config.fields.find((f) => f.name === "title" || f.name === "name")?.name;
    if (titleKey) copy[titleKey] = `${String(row[titleKey] ?? "")} (copy)`;
    if (hasPublished) copy.published = false;
    openCreate(copy);
  };

  const ids = (list: Row[]) => list.map((r) => String(r.id));
  const selectedRows = rows.filter((r) => selected.has(String(r.id)));
  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((r) => selected.has(String(r.id)));
  const toggleRow = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelected((s) => {
      const next = new Set(s);
      for (const id of ids(pageItems)) {
        if (allOnPageSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const bulkPublish = async (published: boolean) => {
    setBulkBusy(true);
    try {
      await Promise.all(
        selectedRows.map((r) => updateRow(config.table, String(r.id), { published } as never)),
      );
      toast.success(`${selectedRows.length} ${published ? "published" : "moved to drafts"}`);
      setSelected(new Set());
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk update failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const doDelete = async (list: Row[]) => {
    setBulkBusy(true);
    try {
      await Promise.all(list.map((r) => deleteRow(config.table, String(r.id))));
      toast.success(
        list.length === 1 ? `Deleted “${config.rowTitle(list[0])}”` : `${list.length} deleted`,
      );
      setSelected((s) => {
        const next = new Set(s);
        for (const id of ids(list)) next.delete(id);
        return next;
      });
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBulkBusy(false);
      setConfirmDelete(null);
    }
  };

  const togglePublished = async (row: Row) => {
    try {
      await updateRow(config.table, String(row.id), { published: !row.published } as never);
      toast.success(row.published ? "Moved to drafts" : "Published");
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  };

  const extraColumns = config.columns
    .filter(
      (c) => !["title", "name", "published", ...DATE_KEYS].includes(c.key) && c.key !== imageField,
    )
    .slice(0, 2);

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 text-h4 font-bold">
            {type && (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-brass">
                <type.icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              </span>
            )}
            {config.title}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{config.description}</p>
        </div>
        <Button
          type="button"
          onClick={() => openCreate()}
          className="shrink-0 self-start sm:self-auto"
        >
          <Plus /> New {singular}
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${config.title.toLowerCase()}…`}
            aria-label={`Search ${config.title.toLowerCase()}`}
            className="pl-10"
          />
        </div>
        {hasPublished && (
          <div
            role="group"
            aria-label="Filter by status"
            className="flex shrink-0 gap-1 rounded-full border border-border bg-card p-1 shadow-xs"
          >
            {(["all", "published", "draft"] as Status[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold capitalize transition-colors",
                  status === s
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "draft" ? "Drafts" : s}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[0.68rem] tabular-nums",
                    status === s ? "bg-white/15" : "bg-secondary",
                  )}
                >
                  {counts[s]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="mt-5">
        {query.isLoading ? (
          <div className="card divide-y divide-border" role="status" aria-label="Loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="h-11 w-11 animate-pulse rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-1/4 animate-pulse rounded-full bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <QueryError
            message={query.error instanceof Error ? query.error.message : undefined}
            onRetry={() => query.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={type ? <type.icon /> : <FileText />}
            title={`No ${config.title.toLowerCase()} yet`}
            description="Create the first entry to publish it on the public site."
            action={
              <Button type="button" onClick={() => openCreate()}>
                <Plus /> New {singular}
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title="Nothing matches"
            description="Try another search or status."
          />
        ) : (
          <>
            <div className="card overflow-hidden">
              {/* Column header (md+) */}
              <div className="hidden items-center gap-4 border-b border-border bg-secondary/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:flex">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={togglePage}
                  aria-label="Select all on this page"
                />
                <button
                  type="button"
                  onClick={() => toggleSort("title")}
                  className="flex flex-1 items-center gap-1.5 text-left hover:text-foreground"
                >
                  Title <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
                </button>
                {extraColumns.map((c) => (
                  <span key={c.key} className="hidden w-36 truncate lg:block">
                    {c.label}
                  </span>
                ))}
                {hasPublished && <span className="w-24">Status</span>}
                <button
                  type="button"
                  onClick={() => toggleSort("date")}
                  className="flex w-28 items-center gap-1.5 hover:text-foreground"
                >
                  Date <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span className="w-9" />
              </div>

              <ul className="divide-y divide-border">
                {pageItems.map((row) => {
                  const id = String(row.id);
                  const isSelected = selected.has(id);
                  const href = type?.publicPath?.(row) ?? null;
                  const img = imageField ? (row[imageField] as string | null) : null;
                  const date = rowDate(row);
                  return (
                    <li
                      key={id}
                      className={cn(
                        "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/40 md:gap-4",
                        isSelected && "bg-accent/50 hover:bg-accent/60",
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(id)}
                        aria-label={`Select ${config.rowTitle(row)}`}
                      />
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-muted-foreground ring-1 ring-border">
                          {img ? (
                            <img
                              src={img}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : type ? (
                            <type.icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
                          ) : (
                            <ImageIcon className="h-4 w-4" aria-hidden />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold tracking-tight group-hover:text-brass">
                            {config.rowTitle(row)}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground md:hidden">
                            {hasPublished && <StatusPill published={row.published === true} />}
                            {date && formatDate(date)}
                          </span>
                          {extraColumns[0] && (
                            <span className="mt-0.5 hidden truncate text-xs text-muted-foreground md:block lg:hidden">
                              {cellText(row, extraColumns[0])}
                            </span>
                          )}
                        </span>
                      </button>
                      {extraColumns.map((c) => (
                        <span
                          key={c.key}
                          className="hidden w-36 truncate text-sm text-muted-foreground lg:block"
                        >
                          {cellText(row, c)}
                        </span>
                      ))}
                      {hasPublished && (
                        <span className="hidden w-24 md:block">
                          <StatusPill published={row.published === true} />
                        </span>
                      )}
                      <span className="hidden w-28 text-sm tabular-nums text-muted-foreground md:block">
                        {date ? formatDate(date) : "—"}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${config.rowTitle(row)}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onSelect={() => openEdit(row)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => duplicate(row)}>
                            <Copy /> Duplicate
                          </DropdownMenuItem>
                          {hasPublished && (
                            <DropdownMenuItem onSelect={() => void togglePublished(row)}>
                              {row.published ? <EyeOff /> : <Eye />}{" "}
                              {row.published ? "Move to drafts" : "Publish"}
                            </DropdownMenuItem>
                          )}
                          {href && (
                            <DropdownMenuItem asChild>
                              <a href={href} target="_blank" rel="noreferrer">
                                <Eye /> View on site
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => setConfirmDelete([row])}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, visible.length)} of{" "}
                {visible.length}
              </p>
              {totalPages > 1 && (
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
                  className="mx-0 w-auto"
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-3 bottom-[calc(1rem+var(--safe-bottom))] z-40 mx-auto flex max-w-2xl animate-rise flex-wrap items-center gap-2 rounded-2xl border border-white/10 surface-ink p-2 pl-4 shadow-float sm:inset-x-6">
          <span className="mr-auto text-sm font-semibold text-ink-foreground">
            {selected.size} selected
          </span>
          {hasPublished && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outlineInk"
                disabled={bulkBusy}
                onClick={() => void bulkPublish(true)}
              >
                <Eye /> Publish
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outlineInk"
                disabled={bulkBusy}
                onClick={() => void bulkPublish(false)}
              >
                <EyeOff /> Unpublish
              </Button>
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={bulkBusy}
            onClick={() => setConfirmDelete(selectedRows)}
          >
            <Trash2 /> Delete
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outlineInk"
            aria-label="Clear selection"
            onClick={() => setSelected(new Set())}
          >
            <X />
          </Button>
        </div>
      )}

      <Editor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        config={config}
        type={type}
        singular={singular}
        row={editingRow}
        onSaved={invalidate}
      />

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.length === 1
                ? `Delete “${config.rowTitle(confirmDelete[0])}”?`
                : `Delete ${confirmDelete?.length} items?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes them permanently and they disappear from the public site immediately.
              {hasPublished && " To hide something temporarily, move it to drafts instead."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && void doDelete(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Editor ---------------- */

function Editor({
  open,
  onOpenChange,
  config,
  type,
  singular,
  row,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ContentCrudConfig;
  type?: ContentType;
  singular: string;
  row: Row | null;
  onSaved: () => void;
}) {
  const isEdit = Boolean(row && !row.__duplicate);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Config-driven admin form: field set and validation vary per table, so the values shape can't be a fixed generic here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    resolver: zodResolver(config.schema),
    defaultValues: config.defaultValues,
  });

  useEffect(() => {
    if (!open) return;
    const values = row ? { ...config.defaultValues, ...row } : config.defaultValues;
    delete (values as Row).__duplicate;
    form.reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row]);

  const dirty = form.formState.isDirty;
  const requestClose = (next: boolean) => {
    if (!next && dirty && !saving) setConfirmDiscard(true);
    else onOpenChange(next);
  };

  const onSubmit = async (values: Row) => {
    setSaving(true);
    try {
      if (isEdit && row) {
        await updateRow(config.table, String(row.id), values as never);
        toast.success(`${capitalize(singular)} saved`);
      } else {
        await insertRow(config.table, values as never);
        toast.success(`${capitalize(singular)} created`);
      }
      form.reset(values);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd + S saves while the editor is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void form.handleSubmit(onSubmit)();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const main = config.fields.filter((f) => f.type === "text" || f.type === "textarea");
  const side = config.fields.filter((f) => !(f.type === "text" || f.type === "textarea"));
  const href = isEdit && row ? type?.publicPath?.(row) : null;

  return (
    <>
      <Sheet open={open} onOpenChange={requestClose}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4 pr-14 pt-[calc(1rem+var(--safe-top))] sm:px-6">
            {type && (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-brass">
                <type.icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg font-bold">
                {isEdit ? `Edit ${singular}` : `New ${singular}`}
              </SheetTitle>
              <SheetDescription className="truncate text-xs">
                {isEdit && row ? config.rowTitle(row) : config.description}
              </SheetDescription>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
                <div className={cn("grid gap-6", side.length > 0 && "lg:grid-cols-[1fr_15rem]")}>
                  <div className="min-w-0 space-y-5">
                    {main.map((field) => (
                      <FormField
                        key={field.name}
                        control={form.control}
                        name={field.name}
                        render={({ field: rhf }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel className="font-semibold">{field.label}</FormLabel>
                              {field.type === "textarea" && (
                                <span className="text-[0.7rem] tabular-nums text-muted-foreground">
                                  {String(rhf.value ?? "").length.toLocaleString("en-GB")}{" "}
                                  characters
                                </span>
                              )}
                            </div>
                            <FormControl>
                              {field.type === "textarea" &&
                              LONG_FORM.test(field.name) &&
                              field.name !== "summary" ? (
                                <LongFormEditor field={field} rhf={rhf} />
                              ) : (
                                renderInput(field, rhf)
                              )}
                            </FormControl>
                            {field.name === "slug" && (
                              <p className="text-xs text-muted-foreground">
                                Used in the page address. Leave blank to generate it from the title.
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  {side.length > 0 && (
                    <aside className="space-y-5 lg:border-l lg:border-border lg:pl-6">
                      <p className="eyebrow text-muted-foreground">Settings</p>
                      {side.map((field) => (
                        <FormField
                          key={field.name}
                          control={form.control}
                          name={field.name}
                          render={({ field: rhf }) => (
                            <FormItem
                              className={cn(
                                field.type === "boolean" &&
                                  "card-inset flex items-center justify-between gap-3 space-y-0 p-3",
                              )}
                            >
                              <FormLabel className="font-semibold">
                                {field.label}
                                {field.name === "published" && (
                                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                                    {rhf.value ? "Visible on the site" : "Saved as a draft"}
                                  </span>
                                )}
                              </FormLabel>
                              <FormControl>{renderInput(field, rhf)}</FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </aside>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border bg-card/95 px-5 py-3 pb-[calc(0.75rem+var(--safe-bottom))] backdrop-blur sm:px-6">
                <span className="mr-auto text-xs text-muted-foreground">
                  {dirty ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-warning-foreground dark:text-warning">
                      <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden /> Unsaved
                      changes
                    </span>
                  ) : (
                    <span className="hidden sm:inline">Tip: Ctrl + S saves</span>
                  )}
                </span>
                {href && (
                  <Button asChild type="button" variant="ghost" size="sm">
                    <a href={href} target="_blank" rel="noreferrer">
                      <Eye /> View
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => requestClose(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={saving}>
                  {isEdit ? "Save changes" : `Create ${singular}`}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your edits to this {singular} haven't been saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                form.reset();
                onOpenChange(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LongFormEditor({ field, rhf }: { field: CrudField; rhf: ControllerRenderProps }) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const value = (rhf.value as string | null | undefined) ?? "";
  return (
    <div className="overflow-hidden rounded-xl border border-input bg-card focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
      <div className="flex items-center gap-1 border-b border-border bg-secondary/50 p-1">
        {(["write", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn(
              "min-h-8 rounded-lg px-3 text-xs font-semibold capitalize",
              tab === t
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto pr-2 text-[0.68rem] text-muted-foreground">
          Markdown supported
        </span>
      </div>
      {tab === "write" ? (
        <textarea
          {...rhf}
          value={value}
          rows={14}
          placeholder={field.placeholder}
          className="block w-full resize-y border-0 bg-transparent px-4 py-3 font-mono text-sm leading-relaxed focus:outline-none"
        />
      ) : (
        <div className="min-h-[18rem] px-4 py-3 text-sm leading-relaxed">
          {value.trim() ? (
            <MarkdownLite text={value} />
          ) : (
            <p className="text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusPill({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold",
        published ? "bg-success/12 text-success" : "bg-secondary text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          published ? "bg-success" : "bg-muted-foreground/60",
        )}
        aria-hidden
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}

function rowDate(row: Row): string | null {
  for (const k of DATE_KEYS) if (typeof row[k] === "string" && row[k]) return row[k] as string;
  return null;
}

function cellText(row: Row, col: CrudColumn): ReactNode {
  if (col.render) return col.render(row);
  const v = row[col.key];
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return formatDate(v);
  return String(v);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function renderInput(field: CrudField, rhfField: ControllerRenderProps) {
  switch (field.type) {
    case "image":
      return <ImageUploadField rhfField={rhfField} />;
    case "textarea":
      return (
        <Textarea
          rows={field.name === "summary" ? 3 : 6}
          placeholder={field.placeholder}
          {...rhfField}
          value={(rhfField.value as string | null | undefined) ?? ""}
        />
      );
    case "boolean":
      return (
        <Switch
          checked={Boolean(rhfField.value)}
          onCheckedChange={rhfField.onChange}
          ref={rhfField.ref}
        />
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
