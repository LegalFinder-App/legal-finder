// Server-only. Verified advocate suggestions for Counsellor AI. Returns live directory rows only —
// never invented names. Matching is wider than "find a lawyer" so people with a concrete legal
// problem also get relevant, accepting advocates when that helps.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { CounsellorAdvocate } from "@/lib/assistant-advocates";

const EXPLICIT_CUES =
  /\b(advocate|lawyer|attorney|counsel|solicitor|counsellor|counselor|representation|retain|book a consultation|find (an? )?(advocate|lawyer)|recommend (an? )?(advocate|lawyer)|who can (help|represent)|need (an? )?(advocate|lawyer))\b/i;

/** Situations where a verified advocate is often the right next step. */
const SITUATION_CUES =
  /\b(arrest(ed)?|bail|charge(d|s)?|police custody|remand|divorce|custody|maintenance|land dispute|eviction|landlord|tenant|tenancy|sued|sue|lawsuit|court (case|hearing|date)|inheritance|succession|will|probate|dismiss(ed|al)|retrench|wrongful termination|employment dispute|domestic violence|defamation|debt recovery|contract dispute|company formation|conveyancing)\b/i;

export function shouldSuggestAdvocates(query: string) {
  return EXPLICIT_CUES.test(query) || SITUATION_CUES.test(query);
}

function truncate(text: string | null | undefined, max = 220): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

export async function findRelevantAdvocates(
  query: string,
  limit = 5,
): Promise<CounsellorAdvocate[]> {
  if (!shouldSuggestAdvocates(query)) return [];

  try {
    const { data, error } = await supabaseAdmin
      .from("lawyers")
      .select(
        "id, full_name, headline, bio, photo_url, verified, city, county, firm, practice_areas, languages, years_experience, consultation_fee, rating, review_count, accepting_clients",
      )
      .eq("verified", true)
      .eq("accepting_clients", true)
      .order("rating", { ascending: false })
      .limit(40);

    if (error) throw error;

    const terms = query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .slice(0, 12);

    const scored = (data ?? [])
      .map((row) => {
        const haystack =
          `${row.full_name} ${row.headline ?? ""} ${row.bio ?? ""} ${row.firm ?? ""} ${row.city ?? ""} ${row.county ?? ""} ${(row.practice_areas ?? []).join(" ")} ${(row.languages ?? []).join(" ")}`.toLowerCase();
        let score = 1 + Math.min(3, Number(row.rating) || 0);
        for (const term of terms) {
          if (haystack.includes(term)) score += term.length >= 6 ? 3 : 2;
        }
        if ((row.practice_areas ?? []).some((area) => query.toLowerCase().includes(area.toLowerCase()))) {
          score += 4;
        }
        return { row, score };
      })
      .sort((a, b) => b.score - a.score || b.row.rating - a.row.rating)
      .slice(0, limit);

    return scored.map(({ row }) => ({
      id: row.id,
      fullName: row.full_name,
      headline: row.headline,
      bio: truncate(row.bio),
      photoUrl: row.photo_url,
      verified: row.verified,
      city: row.city,
      county: row.county,
      firm: row.firm,
      practiceAreas: row.practice_areas ?? [],
      languages: row.languages ?? [],
      yearsExperience: row.years_experience ?? 0,
      consultationFee: row.consultation_fee,
      rating: row.rating ?? 0,
      reviewCount: row.review_count ?? 0,
      href: `/lawyers/${row.id}`,
    }));
  } catch (error) {
    console.error("[assistant-advocates]", error);
    return [];
  }
}

export function formatAdvocatesForPrompt(advocates: CounsellorAdvocate[]): string {
  if (advocates.length === 0) return "";
  const lines = advocates.map((a, i) => {
    const location = [a.city, a.county].filter(Boolean).join(", ");
    const fee =
      a.consultationFee != null && a.consultationFee > 0
        ? `consultation from UGX ${Math.round(a.consultationFee).toLocaleString("en-UG")}`
        : null;
    const bits = [
      a.verified ? "verified on LegalFinder" : null,
      a.headline,
      a.firm ? `firm: ${a.firm}` : null,
      location || null,
      a.yearsExperience > 0 ? `${a.yearsExperience} years' experience` : null,
      a.practiceAreas.length ? `areas: ${a.practiceAreas.slice(0, 5).join(", ")}` : null,
      a.languages.length ? `languages: ${a.languages.slice(0, 4).join(", ")}` : null,
      a.rating > 0 ? `rating ${a.rating.toFixed(1)} (${a.reviewCount} reviews)` : null,
      fee,
      a.bio,
      `profile: ${a.href}`,
    ].filter(Boolean);
    return `${i + 1}. ${a.fullName} [${a.id}]\n   ${bits.join(" · ")}`;
  });

  return `Verified advocates currently accepting clients on LegalFinder (use ONLY these when recommending people — never invent an advocate, phone number, or fee):
${lines.join("\n")}
When recommending, give a one-sentence why-this-person fit, mention the practice areas and location, and link their profile path (e.g. ${advocates[0]?.href ?? "/lawyers"}). For the full directory: /lawyers.`;
}
