import { supabase } from "@/integrations/supabase/client";
import type { AppDatabase } from "@/integrations/supabase/app-database";
import type { AppRole } from "@/lib/session";

type Tables = AppDatabase["public"]["Tables"];
export type TableName = keyof Tables;

/**
 * Generic typed CRUD helpers shared by the admin CMS and users panel — one error/toast pattern
 * instead of ad hoc inline `supabase.from(...)` calls per feature. Supabase-js's `.from()` can't
 * resolve its overload against a generic (non-literal) table name, so the client is narrowed to
 * `any` only at the call site here — callers of these functions still get full input/output typing
 * from the generic signatures below.
 */
const untypedClient = supabase as unknown as {
  from: (table: string) => {
    insert: (values: unknown) => {
      select: () => { single: () => Promise<{ data: unknown; error: { message: string } | null }> };
    };
    update: (values: unknown) => {
      eq: (
        col: string,
        val: string,
      ) => {
        select: () => {
          single: () => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
    delete: () => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function insertRow<T extends TableName>(
  table: T,
  values: Tables[T]["Insert"],
): Promise<Tables[T]["Row"]> {
  const { data, error } = await untypedClient.from(table).insert(values).select().single();
  if (error) throw new Error(error.message);
  return data as Tables[T]["Row"];
}

export async function updateRow<T extends TableName>(
  table: T,
  id: string,
  values: Tables[T]["Update"],
): Promise<Tables[T]["Row"]> {
  const { data, error } = await untypedClient
    .from(table)
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Tables[T]["Row"];
}

export async function deleteRow(table: TableName, id: string): Promise<void> {
  const { error } = await untypedClient.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function assignRole(userId: string, role: AppRole): Promise<void> {
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
  if (error) throw new Error(error.message);
}

export async function revokeRole(userId: string, role: AppRole): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) throw new Error(error.message);
}
