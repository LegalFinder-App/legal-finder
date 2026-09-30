import { queryOptions } from "@tanstack/react-query";
import type { AppDatabase } from "@/types/app-database";
import { supabase, unwrap } from "./supabase";

// A near line-for-line port of the web app's src/lib/queries.ts — same tables, same filters and
// the same query keys, so RLS behaves identically and the two stay easy to compare.

type Tables = AppDatabase["public"]["Tables"];
export type Row<T extends keyof Tables> = Tables[T]["Row"];

export type Lawyer = Row<"lawyers">;
export type CaseRow = Row<"cases">;
export type Appointment = Row<"appointments">;
export type Conversation = Row<"conversations">;
export type Message = Row<"messages">;
export type DocumentRow = Row<"documents">;
export type NotificationRow = Row<"notifications">;
export type IncidentReport = Row<"incident_reports">;
export type PaymentRow = Row<"payments">;
export type ProfileRow = Row<"profiles">;

export type LawyerSearch = { q?: string; area?: string; county?: string };

export const lawyersQuery = (search?: LawyerSearch, options?: { verifiedOnly?: boolean }) =>
  queryOptions({
    queryKey: ["lawyers", search ?? {}, options?.verifiedOnly ?? false],
    queryFn: async () => {
      let query = supabase.from("lawyers").select("*").order("rating", { ascending: false });
      if (options?.verifiedOnly) query = query.eq("verified", true);
      if (search?.q) query = query.ilike("full_name", `%${search.q}%`);
      if (search?.area) query = query.contains("practice_areas", [search.area]);
      if (search?.county) query = query.eq("county", search.county);
      return unwrap(await query) as Lawyer[];
    },
  });

export const publicLawyersQuery = (search?: LawyerSearch) =>
  lawyersQuery(search, { verifiedOnly: true });

export const myLawyerProfileQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-lawyer-profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lawyers")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as Lawyer | null;
    },
  });

export const lawyerCpdRecordsQuery = (lawyerId: string | undefined) =>
  queryOptions({
    queryKey: ["lawyer-cpd-records", lawyerId],
    enabled: Boolean(lawyerId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("lawyer_cpd_records")
          .select("*")
          .eq("lawyer_id", lawyerId!)
          .order("completed_on", { ascending: false }),
      ),
  });

export const lawyerQuery = (id: string) =>
  queryOptions({
    queryKey: ["lawyer", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lawyers").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data as Lawyer | null;
    },
  });

export const reviewsQuery = (lawyerId: string) =>
  queryOptions({
    queryKey: ["reviews", lawyerId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("reviews")
          .select("*")
          .eq("lawyer_id", lawyerId)
          .order("created_at", { ascending: false }),
      ),
  });

export const adviceListQuery = queryOptions({
  queryKey: ["advice"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("legal_advices")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false }),
    ),
});

export const adviceQuery = (slug: string) =>
  queryOptions({
    queryKey: ["advice", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_advices")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const newsListQuery = queryOptions({
  queryKey: ["news"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("news_posts")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false }),
    ),
});

export const newsQuery = (slug: string) =>
  queryOptions({
    queryKey: ["news", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const judgementsQuery = queryOptions({
  queryKey: ["judgements"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("judgements")
        .select("*")
        .eq("published", true)
        .order("decided_on", { ascending: false }),
    ),
});

export const libraryQuery = queryOptions({
  queryKey: ["library"],
  queryFn: async () => unwrap(await supabase.from("library_items").select("*").order("title")),
});

export const stationsQuery = queryOptions({
  queryKey: ["stations"],
  queryFn: async () => unwrap(await supabase.from("police_stations").select("*").order("name")),
});

export const wantedQuery = queryOptions({
  queryKey: ["wanted"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("wanted_persons")
        .select("*")
        .eq("status", "wanted")
        .order("created_at", { ascending: false }),
    ),
});

export const wantedPersonQuery = (id: string) =>
  queryOptions({
    queryKey: ["wanted", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wanted_persons")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const securityTipsQuery = queryOptions({
  queryKey: ["security-tips"],
  queryFn: async () => unwrap(await supabase.from("security_tips").select("*")),
});

export const quotesQuery = queryOptions({
  queryKey: ["quotes"],
  queryFn: async () => unwrap(await supabase.from("quotes").select("*")),
});

export const userRolesQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["roles", userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw new Error(error.message);
      return (data ?? []).map((entry) => entry.role);
    },
  });

export const profileQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const myCasesQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["cases", userId],
    enabled: Boolean(userId),
    queryFn: async () =>
      unwrap(
        await supabase.from("cases").select("*").order("updated_at", { ascending: false }),
      ) as CaseRow[],
  });

export const caseQuery = (id: string) =>
  queryOptions({
    queryKey: ["case", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data as CaseRow | null;
    },
  });

export const caseUpdatesQuery = (caseId: string) =>
  queryOptions({
    queryKey: ["case-updates", caseId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("case_updates")
          .select("*")
          .eq("case_id", caseId)
          .order("created_at", { ascending: false }),
      ),
  });

export const caseDeadlinesQuery = (caseId: string) =>
  queryOptions({
    queryKey: ["case-deadlines", caseId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("case_deadlines")
          .select("*")
          .eq("case_id", caseId)
          .order("due_date", { ascending: true }),
      ),
  });

export const appointmentsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["appointments", userId],
    enabled: Boolean(userId),
    queryFn: async () =>
      unwrap(
        await supabase.from("appointments").select("*").order("scheduled_at"),
      ) as Appointment[],
  });

export const conversationsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["conversations", userId],
    enabled: Boolean(userId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("conversations")
          .select("*")
          .order("last_message_at", { ascending: false }),
      ) as Conversation[],
  });

export const messagesQuery = (conversationId: string | null) =>
  queryOptions({
    queryKey: ["messages", conversationId],
    enabled: Boolean(conversationId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId!)
          .order("created_at"),
      ) as Message[],
  });

export const documentsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["documents", userId],
    enabled: Boolean(userId),
    queryFn: async () =>
      unwrap(
        await supabase.from("documents").select("*").order("created_at", { ascending: false }),
      ) as DocumentRow[],
  });

export const notificationsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ) as NotificationRow[],
  });

export const incidentReportsQuery = queryOptions({
  queryKey: ["incident-reports"],
  queryFn: async () =>
    unwrap(
      await supabase.from("incident_reports").select("*").order("created_at", { ascending: false }),
    ) as IncidentReport[],
});

export const auditLogsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["audit-logs", userId],
    enabled: Boolean(userId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ),
  });

export const allProfilesQuery = queryOptions({
  queryKey: ["admin-profiles"],
  queryFn: async () =>
    unwrap(
      await supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ) as ProfileRow[],
});

export const allUserRolesQuery = queryOptions({
  queryKey: ["admin-user-roles"],
  queryFn: async () => unwrap(await supabase.from("user_roles").select("*")) as Row<"user_roles">[],
});

// RLS scopes payments to client_id = self, lawyer_id = self, or admin, so one query serves all.
export const paymentsQuery = queryOptions({
  queryKey: ["payments"],
  queryFn: async () =>
    unwrap(
      await supabase.from("payments").select("*").order("created_at", { ascending: false }),
    ) as PaymentRow[],
});

export interface AppSettings {
  id: string;
  maintenance_mode: boolean;
  incident_reporting_enabled: boolean;
  wanted_notices_enabled: boolean;
  ai_assistant_enabled: boolean;
}

const FALLBACK_SETTINGS: AppSettings = {
  id: "global",
  maintenance_mode: false,
  incident_reporting_enabled: true,
  wanted_notices_enabled: true,
  ai_assistant_enabled: true,
};

// app_settings isn't in the generated types yet (same as on the web — see src/lib/app-settings.ts).
const untyped = supabase as unknown as {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        maybeSingle: () => Promise<{ data: AppSettings | null; error: { message: string } | null }>;
      };
    };
  };
};

export const appSettingsQuery = queryOptions({
  queryKey: ["app-settings"],
  staleTime: 60_000,
  queryFn: async (): Promise<AppSettings> => {
    const { data, error } = await untyped
      .from("app_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? FALLBACK_SETTINGS;
  },
});
