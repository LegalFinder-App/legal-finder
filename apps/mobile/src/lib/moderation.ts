import { queryOptions } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { ReportReason, ReportTargetType } from "@/types/app-database";

// Reporting and blocking (App Store guideline 1.2). The rules live in the database
// (supabase/migrations/20261004120000_reports_and_blocks.sql): a report records the reported text
// from the database itself and notifies every administrator; a block stops either person
// messaging the other.

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "harassment", label: "Harassment or threats" },
  { value: "offensive", label: "Offensive or inappropriate" },
  { value: "spam", label: "Spam or advertising" },
  { value: "fraud", label: "Scam or fraud" },
  { value: "other", label: "Something else" },
];

export async function reportContent(input: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}) {
  const { error } = await supabase.from("content_reports").insert({
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

/** The people this account has blocked (it can't see who has blocked it). */
export const myBlocksQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["blocks", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocked_id")
        .eq("blocker_id", userId!);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => row.blocked_id);
    },
  });

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("user_blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  // Already blocked is the outcome the person asked for.
  if (error && error.code !== "23505") throw new Error(error.message);
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw new Error(error.message);
}
