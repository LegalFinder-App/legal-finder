import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppDatabase } from "@/integrations/supabase/app-database";

export function unwrap<T>({
  data,
  error,
}: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export type Lawyer = {
  id: string;
  user_id: string | null;
  full_name: string;
  headline: string | null;
  firm: string | null;
  city: string | null;
  county: string | null;
  bio: string | null;
  photo_url: string | null;
  practice_areas: string[];
  languages: string[];
  rating: number;
  review_count: number;
  years_experience: number;
  hourly_rate: number | null;
  consultation_fee: number | null;
  verified: boolean;
  accepting_clients: boolean;
  email: string | null;
  phone: string | null;
  bar_number: string | null;
};

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

type LawyerSearch = { q?: string; area?: string; county?: string };

export const publicLawyersQuery = (search?: LawyerSearch) =>
  lawyersQuery(search, { verifiedOnly: true });

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
      unwrap(await supabase.from("cases").select("*").order("updated_at", { ascending: false })),
  });

export const caseQuery = (id: string) =>
  queryOptions({
    queryKey: ["case", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
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

export const appointmentsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["appointments", userId],
    enabled: Boolean(userId),
    queryFn: async () =>
      unwrap(await supabase.from("appointments").select("*").order("scheduled_at")),
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
      ),
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
      ),
  });

export const documentsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["documents", userId],
    enabled: Boolean(userId),
    queryFn: async () =>
      unwrap(
        await supabase.from("documents").select("*").order("created_at", { ascending: false }),
      ),
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
      ),
  });

export const pushSubscriptionsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["push-subscriptions", userId],
    enabled: Boolean(userId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("push_subscriptions")
          .select("*")
          .order("created_at", { ascending: false }),
      ),
  });

export const incidentReportsQuery = queryOptions({
  queryKey: ["incident-reports"],
  queryFn: async () =>
    unwrap(
      await supabase.from("incident_reports").select("*").order("created_at", { ascending: false }),
    ),
});

export type AuditLog = AppDatabase["public"]["Tables"]["audit_logs"]["Row"];

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

// --- Admin-only reads (RLS permits admin to see every row on these tables) ---

export type CaseRow = AppDatabase["public"]["Tables"]["cases"]["Row"];

export const allCasesQuery = queryOptions({
  queryKey: ["admin-cases"],
  queryFn: async () =>
    unwrap<CaseRow[]>(
      await supabase.from("cases").select("*").order("created_at", { ascending: false }),
    ),
});

export type ProfileRow = AppDatabase["public"]["Tables"]["profiles"]["Row"];

export const allProfilesQuery = queryOptions({
  queryKey: ["admin-profiles"],
  queryFn: async () =>
    unwrap<ProfileRow[]>(
      await supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ),
});

export type UserRoleRow = AppDatabase["public"]["Tables"]["user_roles"]["Row"];

export const allUserRolesQuery = queryOptions({
  queryKey: ["admin-user-roles"],
  queryFn: async () => unwrap<UserRoleRow[]>(await supabase.from("user_roles").select("*")),
});
