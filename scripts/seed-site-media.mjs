// One-off seed script: downloads a curated set of practice-area illustrations and dashboard
// empty-state imagery, uploads each to ImageKit, and upserts metadata into the `site_media`
// table (see supabase/migrations/20260910120000_site_media.sql). Not part of the build — run
// manually once (and again only if you change the curated lists below):
//
//   node --env-file=.env scripts/seed-site-media.mjs
//
// This is a standalone script (not a browser upload), so it talks to ImageKit's REST API
// directly with IMAGEKIT_PRIVATE_KEY rather than reusing src/lib/imagekit.functions.ts, which
// is a Clerk-gated TanStack server function meant to be called from an authenticated request,
// not a CLI process.
import { createClient } from "@supabase/supabase-js";

const IMAGEKIT_PRIVATE_KEY = requireEnv("IMAGEKIT_PRIVATE_KEY");
const IMAGEKIT_UPLOAD_FOLDER = process.env.IMAGEKIT_UPLOAD_FOLDER || "/legalfinder";
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const UNDRAW_RAW_BASE = "https://raw.githubusercontent.com/cuuupid/undraw-illustrations/master/svg";
// unDraw's classic single accent color, present across most of the catalog (verified against
// several sample files) — swapped for the app's brass so these actually read as "Chambers"
// illustrations instead of generic stock purple. Every other color (skin tones, neutrals,
// incidental accents) is left untouched.
const UNDRAW_ACCENT = /#6c63ff/gi;
const BRASS_HEX = "#C9A24B";

/**
 * Practice-area illustrations. `lawyers.practice_areas` is free text (no fixed category list
 * exists in the schema), so `keywords` drives a fuzzy match at read time in src/lib/site-media.ts
 * — the last entry (no keywords) is the fallback for anything that doesn't match.
 */
const PRACTICE_AREA_MEDIA = [
  {
    slug: "practice-area-family",
    file: "couple_a7s9.svg",
    alt: "Illustration representing family law",
    keywords: ["family", "divorce", "custody", "marriage", "adoption"],
  },
  {
    slug: "practice-area-criminal",
    file: "dark_alley_hl3o.svg",
    alt: "Illustration representing criminal law",
    keywords: ["criminal", "crime", "defense", "defence", "prosecution"],
  },
  {
    slug: "practice-area-corporate-commercial",
    file: "meeting_115p.svg",
    alt: "Illustration representing corporate and commercial law",
    keywords: ["corporate", "commercial", "business", "contract", "company"],
  },
  {
    slug: "practice-area-land-property",
    file: "houses3_xwf7.svg",
    alt: "Illustration representing land and property law",
    keywords: ["land", "property", "real estate", "conveyancing", "tenancy"],
  },
  {
    slug: "practice-area-employment",
    file: "hiring_cyhs.svg",
    alt: "Illustration representing employment and labour law",
    keywords: ["employment", "labour", "labor", "workplace", "dismissal"],
  },
  {
    slug: "practice-area-immigration",
    file: "airport_2581.svg",
    alt: "Illustration representing immigration law",
    keywords: ["immigration", "visa", "residency", "citizenship"],
  },
  {
    slug: "practice-area-intellectual-property",
    file: "creativity_wqmm.svg",
    alt: "Illustration representing intellectual property law",
    keywords: ["intellectual property", "ip", "copyright", "trademark", "patent"],
  },
  {
    slug: "practice-area-tax",
    file: "finance_0bdk.svg",
    alt: "Illustration representing tax law",
    keywords: ["tax", "taxation", "revenue", "kra"],
  },
  {
    slug: "practice-area-human-rights",
    file: "together_j0gj.svg",
    alt: "Illustration representing human rights law",
    keywords: ["human rights", "civil rights", "constitutional rights"],
  },
  {
    slug: "practice-area-environmental",
    file: "wind_turbine_x2k4.svg",
    alt: "Illustration representing environmental law",
    keywords: ["environmental", "environment", "conservation", "climate"],
  },
  {
    slug: "practice-area-constitutional",
    file: "Building_leu4.svg",
    alt: "Illustration representing constitutional and administrative law",
    keywords: ["constitutional", "administrative", "public law", "government"],
  },
  {
    slug: "practice-area-succession-probate",
    file: "safe_bnk7.svg",
    alt: "Illustration representing succession and probate law",
    keywords: ["succession", "probate", "wills", "estate", "inheritance"],
  },
  {
    slug: "practice-area-banking-finance",
    file: "savings_hjfl.svg",
    alt: "Illustration representing banking and finance law",
    keywords: ["banking", "finance", "loans", "debt recovery"],
  },
  {
    slug: "practice-area-dispute-resolution",
    file: "agreement_aajr.svg",
    alt: "Illustration representing dispute resolution and litigation",
    keywords: ["dispute", "litigation", "arbitration", "mediation", "resolution"],
  },
  {
    slug: "practice-area-general",
    file: "filing_system_b5d2.svg",
    alt: "Illustration representing general legal practice",
    keywords: [], // fallback — matched when nothing else does
  },
];

/**
 * Empty-state photography — dashboards currently show icon/text-only empty states with no
 * imagery at all. Direct, verified Unsplash CDN URLs (Unsplash License: free for commercial
 * use, no attribution required — credit fields below are left null rather than guessed).
 */
const EMPTY_STATE_MEDIA = [
  {
    slug: "empty-state-library",
    url: "https://images.unsplash.com/photo-1685303276798-05e7f07d3927?q=80&w=1200&auto=format&fit=crop",
    alt: "Dense wooden bookshelf of legal volumes",
    keywords: ["cases", "documents", "library", "records"],
  },
  {
    slug: "empty-state-chambers",
    url: "https://images.unsplash.com/photo-1562529163-2cded489cc9a?q=80&w=1200&auto=format&fit=crop",
    alt: "Warmly lit chambers interior with ornate lighting",
    keywords: ["messages", "inbox", "workspace"],
  },
];

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required env var: ${name}. Run with: node --env-file=.env ${process.argv[1]}`,
    );
  }
  return value;
}

async function downloadUndrawIllustration(file) {
  const response = await fetch(`${UNDRAW_RAW_BASE}/${file}`);
  if (!response.ok) throw new Error(`Failed to fetch ${file}: HTTP ${response.status}`);
  const svg = await response.text();
  return svg.replace(UNDRAW_ACCENT, BRASS_HEX);
}

async function downloadPhoto(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function uploadToImageKit({ slug, bytes, fileName, folder }) {
  const form = new FormData();
  form.set("file", new Blob([bytes]), fileName);
  form.set("fileName", fileName);
  form.set("folder", folder);
  // Fixed (not unique) file names so re-running this script updates the same file instead of
  // accumulating duplicates on every run.
  form.set("useUniqueFileName", "false");
  form.set("tags", `site-media,${slug}`);

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString("base64")}`,
    },
    body: form,
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`ImageKit upload failed for ${fileName}: ${body?.message ?? response.status}`);
  }
  return body.url;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const folder = `${IMAGEKIT_UPLOAD_FOLDER}/site`;
  const rows = [];

  for (const item of PRACTICE_AREA_MEDIA) {
    console.log(`Downloading illustration for ${item.slug} (${item.file})...`);
    const svg = await downloadUndrawIllustration(item.file);
    const imageUrl = await uploadToImageKit({
      slug: item.slug,
      bytes: Buffer.from(svg, "utf8"),
      fileName: `${item.slug}.svg`,
      folder,
    });
    rows.push({
      slug: item.slug,
      category: "practice_area",
      image_url: imageUrl,
      alt_text: item.alt,
      keywords: item.keywords,
      credit_name: "unDraw (open source, MIT)",
      credit_url: "https://undraw.co",
    });
    console.log(`  -> ${imageUrl}`);
  }

  for (const item of EMPTY_STATE_MEDIA) {
    console.log(`Downloading photo for ${item.slug}...`);
    const bytes = await downloadPhoto(item.url);
    const imageUrl = await uploadToImageKit({
      slug: item.slug,
      bytes,
      fileName: `${item.slug}.jpg`,
      folder,
    });
    rows.push({
      slug: item.slug,
      category: "empty_state",
      image_url: imageUrl,
      alt_text: item.alt,
      keywords: item.keywords,
      credit_name: null,
      credit_url: null,
    });
    console.log(`  -> ${imageUrl}`);
  }

  console.log(`Upserting ${rows.length} rows into site_media...`);
  const { error } = await supabase.from("site_media").upsert(rows, { onConflict: "slug" });
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);

  console.log(`Done. Seeded ${rows.length} site_media rows.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
