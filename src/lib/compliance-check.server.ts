// Server-only. Scans for advocate license/CPD and case-deadline reminders and delivers them via
// in-app notifications (existing table + realtime channel, see _authenticated/route.tsx) and real
// Web Push (previously subscribe-only — push_subscriptions had no sender). Runs once daily via
// the Vercel Cron job configured in vercel.json, hitting src/routes/api.cron.compliance-check.tsx.
//
// Reminder days are checked for an EXACT match (days-until-due === 30/7/1) rather than "within N
// days" — since this runs once per day and days-until strictly decreases by 1 each run, an exact
// match fires precisely once per threshold with no separate "already reminded" tracking needed.
// Overdue case deadlines are flipped to 'missed' the moment they're detected, which removes them
// from the 'upcoming' scan on every subsequent run — the same self-limiting trick.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LICENSE_REMINDER_DAYS = [30, 7, 1];
const DEADLINE_REMINDER_DAYS = [7, 1];

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

async function sendPushToUser(userId: string, title: string, body: string, url: string) {
  const publicKey = process.env.VITE_WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_secret")
    .eq("user_id", userId)
    .eq("enabled", true);
  if (!subs?.length) return;

  const { default: webpush } = await import("web-push");
  const subject =
    process.env.WEB_PUSH_SUBJECT || process.env.VITE_APP_URL || "https://legalfinder.co";
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const payload = JSON.stringify({ title, body, url });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_secret } },
        payload,
      );
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription is gone (browser data cleared, permission revoked, etc.) — clean it up.
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("[compliance-check] push send failed", error);
      }
    }
  }
}

async function notify(userId: string, title: string, body: string, link: string) {
  await supabaseAdmin
    .from("notifications")
    .insert({ user_id: userId, title, body, link, kind: "compliance" });
  await sendPushToUser(userId, title, body, link);
}

async function checkLicenses(): Promise<number> {
  const { data: lawyers, error } = await supabaseAdmin
    .from("lawyers")
    .select("id, user_id, bar_license_expires_at, license_status")
    .not("bar_license_expires_at", "is", null)
    .not("user_id", "is", null);
  if (error) throw new Error(`License scan failed: ${error.message}`);

  let sent = 0;
  for (const lawyer of lawyers ?? []) {
    if (!lawyer.bar_license_expires_at || !lawyer.user_id) continue;
    const remaining = daysUntil(lawyer.bar_license_expires_at);
    const nextStatus = remaining < 0 ? "expired" : remaining <= 30 ? "expiring" : "active";
    if (nextStatus !== lawyer.license_status) {
      await supabaseAdmin
        .from("lawyers")
        .update({ license_status: nextStatus })
        .eq("id", lawyer.id);
    }

    if (remaining === 0) {
      await notify(
        lawyer.user_id,
        "Bar license expired",
        "Your bar license has expired. Please update your compliance record.",
        "/practice",
      );
      sent++;
    } else if (LICENSE_REMINDER_DAYS.includes(remaining)) {
      await notify(
        lawyer.user_id,
        "Bar license expiring soon",
        `Your bar license expires in ${remaining} day${remaining === 1 ? "" : "s"}. Update it in your Compliance tab.`,
        "/practice",
      );
      sent++;
    }
  }
  return sent;
}

async function checkCaseDeadlines(): Promise<{ reminders: number; missed: number }> {
  const { data: deadlines, error } = await supabaseAdmin
    .from("case_deadlines")
    .select("id, title, due_date, case_id")
    .eq("status", "upcoming");
  if (error) throw new Error(`Deadline scan failed: ${error.message}`);
  if (!deadlines?.length) return { reminders: 0, missed: 0 };

  const caseIds = Array.from(new Set(deadlines.map((d) => d.case_id)));
  const { data: relatedCases, error: casesError } = await supabaseAdmin
    .from("cases")
    .select("id, client_id, lawyer_id, reference")
    .in("id", caseIds);
  if (casesError) throw new Error(`Case lookup failed: ${casesError.message}`);
  const caseById = new Map((relatedCases ?? []).map((c) => [c.id, c]));

  let reminders = 0;
  let missed = 0;
  for (const deadline of deadlines) {
    const caseRow = caseById.get(deadline.case_id);
    if (!caseRow) continue;
    const recipients = [caseRow.client_id, caseRow.lawyer_id].filter((id): id is string =>
      Boolean(id),
    );
    const remaining = daysUntil(deadline.due_date);

    if (remaining < 0) {
      await supabaseAdmin.from("case_deadlines").update({ status: "missed" }).eq("id", deadline.id);
      for (const userId of recipients) {
        await notify(
          userId,
          "Deadline missed",
          `"${deadline.title}" on case ${caseRow.reference} was due ${Math.abs(remaining)} day(s) ago.`,
          `/cases/${deadline.case_id}`,
        );
      }
      missed++;
    } else if (DEADLINE_REMINDER_DAYS.includes(remaining)) {
      for (const userId of recipients) {
        await notify(
          userId,
          "Upcoming deadline",
          `"${deadline.title}" on case ${caseRow.reference} is due in ${remaining} day${remaining === 1 ? "" : "s"}.`,
          `/cases/${deadline.case_id}`,
        );
      }
      reminders++;
    }
  }
  return { reminders, missed };
}

export async function runComplianceCheck() {
  const licenseReminders = await checkLicenses();
  const { reminders: deadlineReminders, missed: deadlinesMissed } = await checkCaseDeadlines();
  return { licenseReminders, deadlineReminders, deadlinesMissed };
}
