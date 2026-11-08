// Text helpers for the legal feed: HTML to plain text, title clean-up, privacy redaction and
// extractive summaries. Pure functions, no network — unit-tested in __tests__/legal-feed.test.ts.

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

export function decodeEntities(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\[\s*…\s*\]|\[\s*\.\.\.\s*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ACRONYMS = new Set([
  "UPF",
  "IGP",
  "DIGP",
  "AIGP",
  "CID",
  "ASP",
  "SSP",
  "SP",
  "CP",
  "AIP",
  "UPDF",
  "URA",
  "KCCA",
  "LDU",
  "IGG",
  "DPP",
  "ODPP",
  "RDC",
  "EAC",
  "UN",
  "AU",
  "NIRA",
  "ADF",
  "UDC",
  "ECCMIS",
  "FY",
  "HW",
  "HE",
  "MP",
  "MPS",
  "ICT",
  "NGO",
  "UNRA",
  "UNEB",
  "UMEME",
  "UETCL",
  "UEDCL",
  "ULS",
  "JSC",
  "UFZEPA",
  "COVID-19",
  "IT",
  "OC",
  "DPC",
  "RPC",
  "II",
  "III",
  "IV",
]);
const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "from",
  "into",
  "over",
  "per",
  "via",
  "vs",
]);

/** UPF titles arrive in ALL CAPS; turn those into Title Case, keeping known acronyms. */
export function tidyTitle(raw: string) {
  const title = decodeEntities(raw).replace(/\s+/g, " ").trim();
  const letters = title.replace(/[^A-Za-z]/g, "");
  const upper = letters.replace(/[^A-Z]/g, "").length;
  if (letters.length < 8 || upper / letters.length < 0.7) return title;
  return title
    .split(" ")
    .map((word, i) => {
      const bare = word.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
      // Known acronyms, and short all-caps words with no vowels (KMP, CMP, PSV…).
      if (ACRONYMS.has(bare) || (bare.length >= 2 && bare.length <= 5 && !/[AEIOU]/.test(bare))) {
        return word.toUpperCase();
      }
      const lower = word.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.replace(
        /(^|[-('"‘“])([a-z])/g,
        (_m, p: string, c: string) => p + c.toUpperCase(),
      );
    })
    .join(" ");
}

/** Splits only before a capital or opening quote, so "04.11.2026" and "Ltd. ," stay whole. */
export function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?]["”’)]?)\s+(?=["“‘(]?[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Social-media tags pasted into posts ("UPFCommunityEngagements", "#PoliceAtWork"). */
function stripTags(text: string) {
  return text
    .replace(/(^|\s)#?[A-Z]{2,}[a-z]+[A-Z][A-Za-z]+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Data Protection and Privacy Act 2019: never surface details about victims of sexual offences
// or about children. A sentence that touches either is dropped from the summary entirely.
const SEXUAL_OFFENCE =
  /\b(defile\w*|rap(e|ed|es|ing|ist)|sexual\w*|sexually|indecent\w*|sodom\w*|incest\w*|molest\w*|gender[- ]based violence|sgbv)\b/i;
// Ages under 18, in digits or words ("10-year-old", "five-year-old", "aged 12").
const UNDER_18 =
  "(?:[1-9]|1[0-7]|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)";
const MINOR = new RegExp(
  String.raw`\b(minors?|juveniles?|pupils?|school ?(girl|boy|child|children)s?|child|children|kids?|toddlers?|infants?|bab(y|ies)|newborns?|teenagers?|` +
    `${UNDER_18}[- ](?:years?|months?)[- ]old|aged ${UNDER_18}\\b)`,
  "i",
);

export function isSensitiveSentence(sentence: string) {
  return SEXUAL_OFFENCE.test(sentence) || MINOR.test(sentence);
}

/**
 * Extractive summary: the first complete sentences that pass the privacy filter, up to ~280
 * characters. No AI — it can't invent anything the source didn't say. When the headline itself
 * concerns a child or a sexual offence, no summary is kept at all (`withheld`), so the UI can
 * say why. Trailing fragments (WordPress cuts excerpts mid-sentence) are dropped.
 */
export function summarize(
  text: string,
  options: { title?: string; maxChars?: number } = {},
): { summary: string | null; withheld: boolean } {
  const maxChars = options.maxChars ?? 280;
  if (options.title && isSensitiveSentence(options.title)) return { summary: null, withheld: true };
  const sentences = splitSentences(stripTags(text)).filter((s) => s.length > 20);
  if (sentences.length === 0) return { summary: null, withheld: false };
  const sensitive = sentences.some(isSensitiveSentence);
  const complete = sentences.filter((s) => /[.!?]["”’)]?$/.test(s));
  const safe = complete.filter((s) => !isSensitiveSentence(s));
  if (safe.length === 0) return { summary: null, withheld: sensitive };
  let out = "";
  for (const s of safe.slice(0, 3)) {
    if (out && out.length + s.length + 1 > maxChars) break;
    out = out ? `${out} ${s}` : s;
  }
  if (out.length > maxChars) out = `${out.slice(0, maxChars - 1).replace(/\s+\S*$/, "")}…`;
  return { summary: out, withheld: false };
}
