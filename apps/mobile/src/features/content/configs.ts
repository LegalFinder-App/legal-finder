// Native mirror of the web CMS configs (src/components/app/admin/content/configs/*): same tables,
// field names, types and options, and — like the web's insertRow — no author/poster columns are
// set client-side. One addition: advice guides expose `category`, a real legal_advices column the
// web editor doesn't surface yet (the Learn tab shows it as a tag).

export type FieldType = "text" | "textarea" | "number" | "boolean" | "date" | "select" | "image";

export interface ContentField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface ContentConfig {
  table: string;
  title: string;
  description: string;
  fields: ContentField[];
  defaults: Record<string, unknown>;
  titleOf: (row: Record<string, unknown>) => string;
  subtitleOf?: (row: Record<string, unknown>) => string | null;
  statusOf?: (row: Record<string, unknown>) => string | null;
  orderBy: { column: string; ascending: boolean };
}

const PUBLISHED = (row: Record<string, unknown>) => (row.published ? "published" : "draft");

export const CONTENT: Record<string, ContentConfig> = {
  advice: {
    table: "legal_advices",
    title: "Advice guides",
    description: "Plain-language guides shown on the public advice hub.",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug (URL)", type: "text", required: true },
      { name: "category", label: "Category", type: "text" },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "body", label: "Body (Markdown)", type: "textarea" },
      { name: "image_url", label: "Cover image", type: "image" },
      { name: "author_name", label: "Author", type: "text" },
      { name: "published", label: "Published", type: "boolean" },
    ],
    defaults: {
      title: "",
      slug: "",
      category: "",
      summary: "",
      body: "",
      image_url: "",
      author_name: "",
      published: false,
    },
    titleOf: (r) => String(r.title ?? "Untitled"),
    subtitleOf: (r) => (r.category ? String(r.category) : null),
    statusOf: PUBLISHED,
    orderBy: { column: "created_at", ascending: false },
  },
  judgements: {
    table: "judgements",
    title: "Judgements",
    description: "Decisions published to the public judgements archive.",
    fields: [
      { name: "case_number", label: "Case number", type: "text", required: true },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "court", label: "Court", type: "text", required: true },
      { name: "judge", label: "Judge", type: "text" },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "body", label: "Full text", type: "textarea" },
      { name: "file_url", label: "PDF link", type: "text" },
      { name: "decided_on", label: "Decided on", type: "date" },
      { name: "published", label: "Published", type: "boolean" },
    ],
    defaults: {
      case_number: "",
      title: "",
      court: "",
      judge: "",
      summary: "",
      body: "",
      file_url: "",
      decided_on: null,
      published: false,
    },
    titleOf: (r) => String(r.title ?? "Untitled"),
    subtitleOf: (r) => [r.case_number, r.court].filter(Boolean).join(" · ") || null,
    statusOf: PUBLISHED,
    orderBy: { column: "decided_on", ascending: false },
  },
  wanted: {
    table: "wanted_persons",
    title: "Wanted persons",
    description: "Notices shown on the public wanted-persons page.",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "alias", label: "Alias", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "offence", label: "Offence", type: "text" },
      { name: "last_seen", label: "Last seen", type: "text" },
      { name: "photo_url", label: "Photo", type: "image" },
      { name: "reward", label: "Reward (UGX)", type: "number" },
      {
        name: "danger_level",
        label: "Danger level",
        type: "select",
        options: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ],
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "wanted", label: "Wanted" },
          { value: "apprehended", label: "Apprehended" },
          { value: "resolved", label: "Resolved" },
        ],
      },
    ],
    defaults: {
      name: "",
      alias: "",
      description: "",
      offence: "",
      last_seen: "",
      photo_url: "",
      reward: null,
      danger_level: "medium",
      status: "wanted",
    },
    titleOf: (r) => String(r.name ?? "Untitled"),
    subtitleOf: (r) => (r.offence ? String(r.offence) : null),
    statusOf: (r) => (r.status ? String(r.status) : null),
    orderBy: { column: "created_at", ascending: false },
  },
  stations: {
    table: "police_stations",
    title: "Police stations",
    description: "Stations listed in the public directory.",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "county", label: "District", type: "text", required: true },
      { name: "address", label: "Address", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "latitude", label: "Latitude", type: "number" },
      { name: "longitude", label: "Longitude", type: "number" },
    ],
    defaults: {
      name: "",
      county: "",
      address: "",
      phone: "",
      email: "",
      latitude: null,
      longitude: null,
    },
    titleOf: (r) => String(r.name ?? "Untitled"),
    subtitleOf: (r) => (r.county ? String(r.county) : null),
    orderBy: { column: "name", ascending: true },
  },
  news: {
    table: "news_posts",
    title: "News",
    description: "Justice-sector news on the public news page.",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug (URL)", type: "text", required: true },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "body", label: "Body (Markdown)", type: "textarea" },
      { name: "image_url", label: "Image", type: "image" },
      { name: "source", label: "Source", type: "text" },
      { name: "author_name", label: "Author", type: "text" },
      { name: "published", label: "Published", type: "boolean" },
    ],
    defaults: {
      title: "",
      slug: "",
      summary: "",
      body: "",
      image_url: "",
      source: "",
      author_name: "",
      published: false,
    },
    titleOf: (r) => String(r.title ?? "Untitled"),
    subtitleOf: (r) => (r.source ? String(r.source) : null),
    statusOf: PUBLISHED,
    orderBy: { column: "created_at", ascending: false },
  },
  library: {
    table: "library_items",
    title: "E-library",
    description: "Statutes, rules and manuals in the public library.",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "author", label: "Author / issuer", type: "text" },
      { name: "category", label: "Category", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "cover_url", label: "Cover", type: "image" },
      { name: "file_url", label: "Document link", type: "text" },
      { name: "year", label: "Year", type: "number" },
    ],
    defaults: {
      title: "",
      author: "",
      category: "",
      description: "",
      cover_url: "",
      file_url: "",
      year: null,
    },
    titleOf: (r) => String(r.title ?? "Untitled"),
    subtitleOf: (r) => (r.category ? String(r.category) : null),
    orderBy: { column: "title", ascending: true },
  },
  safety: {
    table: "security_tips",
    title: "Safety tips",
    description: "Tips shown on the public safety page.",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "body", label: "Body", type: "textarea", required: true },
      { name: "icon", label: "Icon name", type: "text" },
    ],
    defaults: { title: "", body: "", icon: "" },
    titleOf: (r) => String(r.title ?? "Untitled"),
    orderBy: { column: "created_at", ascending: false },
  },
  quotes: {
    table: "quotes",
    title: "Quotes",
    description: "Quotes rotated on the public homepage.",
    fields: [
      { name: "text", label: "Quote", type: "textarea", required: true },
      { name: "author", label: "Author", type: "text" },
    ],
    defaults: { text: "", author: "" },
    titleOf: (r) => String(r.text ?? "").slice(0, 80),
    subtitleOf: (r) => (r.author ? String(r.author) : null),
    orderBy: { column: "created_at", ascending: false },
  },
};
