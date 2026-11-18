// Server-only. Verified advocate suggestions for Counsellor AI when the question is about
// finding representation. Returns live directory rows only.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { CounsellorAdvocate } from "@/lib/assistant-advocates";

const ADVOCATE_CUES =
  /\b(advocate|lawyer|attorney|counsel|solicitor|representation|retain|book a consultation|find (an? )?(advocate|lawyer))\b/i;

export function shouldSuggestAdvocates(query: string) {
  return ADVOCATE_CUES.test(query);
}

export async function findRelevantAdvocates(
  query: string,
  limit = 3,
): Promise<CounsellorAdvocate[]> {
  if (!shouldSuggestAdvocates(query)) return [];

  try {
    const { data, error } = await supabaseAdmin
      .from("lawyers")
      .select(
        "id, full_name, headline, photo_url, verified, city, county, practice_areas, languages, rating",
      )
      .eq("verified", true)
      .eq("accepting_clients", true)
      .order("rating", { ascending: false })
      .limit(24);

    if (error) throw error;

    const terms = query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .slice(0, 8);

    const scored = (data ?? [])
      .map((row) => {
        const haystack =
          `${row.full_name} ${row.headline ?? ""} ${row.city ?? ""} ${row.county ?? ""} ${(row.practice_areas ?? []).join(" ")} ${(row.languages ?? []).join(" ")}`.toLowerCase();
        let score = 1;
        for (const term of terms) {
          if (haystack.includes(term)) score += term.length >= 6 ? 3 : 2;
        }
        return { row, score };
      })
      .sort((a, b) => b.score - a.score || b.row.rating - a.row.rating)
      .slice(0, limit);

    return scored.map(({ row }) => ({
      id: row.id,
      fullName: row.full_name,
      headline: row.headline,
      photoUrl: row.photo_url,
      verified: row.verified,
      city: row.city,
      county: row.county,
      practiceAreas: row.practice_areas ?? [],
      languages: row.languages ?? [],
      href: `/lawyers/${row.id}`,
    }));
  } catch (error) {
    console.error("[assistant-advocates]", error);
    return [];
  }
}

export function formatAdvocatesForPrompt(advocates: CounsellorAdvocate[]): string {
  if (advocates.length === 0) return "";
  const lines = advocates.map(
    (a, i) =>
      `${i + 1}. [${a.id}] ${a.fullName}${a.verified ? " (verified)" : ""}${
        a.headline ? ` — ${a.headline}` : ""
      }${a.city || a.county ? ` · ${[a.city, a.county].filter(Boolean).join(", ")}` : ""}${
        a.practiceAreas.length ? ` · areas: ${a.practiceAreas.slice(0, 4).join(", ")}` : ""
      }`,
  );
  return `Verified advocates from the LegalFinder directory (mention them by name when relevant; do not invent others):
${lines.join("\n")}
- Point readers to /lawyers/${advocates[0]?.id ?? ""} or the directory at /lawyers for booking.`;
}
