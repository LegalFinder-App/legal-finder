import {
  BookOpen,
  Gavel,
  Lightbulb,
  Newspaper,
  Quote,
  Scale,
  ShieldAlert,
  Siren,
  type LucideIcon,
} from "lucide-react";
import type { ContentCrudConfig } from "./content-crud-table";
import { adviceConfig } from "./configs/advice";
import { newsConfig } from "./configs/news";
import { judgementsConfig } from "./configs/judgements";
import { libraryConfig } from "./configs/library";
import { stationsConfig } from "./configs/stations";
import { wantedConfig } from "./configs/wanted";
import { securityTipsConfig } from "./configs/security-tips";
import { quotesConfig } from "./configs/quotes";

/** Everything the CMS shell needs about one content type, on top of its table config. */
export type ContentType = {
  id: string;
  path:
    | "/admin/content/advice"
    | "/admin/content/news"
    | "/admin/content/judgements"
    | "/admin/content/library"
    | "/admin/content/stations"
    | "/admin/content/wanted"
    | "/admin/content/security-tips"
    | "/admin/content/quotes";
  label: string;
  /** "advice guide", "news story"… for buttons and dialog titles. */
  singular: string;
  icon: LucideIcon;
  config: ContentCrudConfig;
  /** Where a row can be seen on the public site, if anywhere. */
  publicPath?: (row: Record<string, unknown>) => string | null;
};

const slugOrId = (row: Record<string, unknown>) => String(row.slug || row.id);

export const CONTENT_TYPES: ContentType[] = [
  {
    id: "advice",
    path: "/admin/content/advice",
    label: "Legal advice",
    singular: "advice guide",
    icon: Lightbulb,
    config: adviceConfig,
    publicPath: (row) => (row.published ? `/advice/${slugOrId(row)}` : null),
  },
  {
    id: "news",
    path: "/admin/content/news",
    label: "News",
    singular: "news story",
    icon: Newspaper,
    config: newsConfig,
    publicPath: (row) => (row.published ? `/news/${slugOrId(row)}` : null),
  },
  {
    id: "judgements",
    path: "/admin/content/judgements",
    label: "Judgements",
    singular: "judgement",
    icon: Gavel,
    config: judgementsConfig,
    publicPath: (row) => (row.published === false ? null : "/judgements"),
  },
  {
    id: "library",
    path: "/admin/content/library",
    label: "Library",
    singular: "library item",
    icon: BookOpen,
    config: libraryConfig,
    publicPath: () => "/library",
  },
  {
    id: "stations",
    path: "/admin/content/stations",
    label: "Police stations",
    singular: "police station",
    icon: Siren,
    config: stationsConfig,
    publicPath: () => "/stations",
  },
  {
    id: "wanted",
    path: "/admin/content/wanted",
    label: "Wanted notices",
    singular: "wanted notice",
    icon: ShieldAlert,
    config: wantedConfig,
    publicPath: (row) => `/wanted/${String(row.id)}`,
  },
  {
    id: "security-tips",
    path: "/admin/content/security-tips",
    label: "Safety tips",
    singular: "safety tip",
    icon: Scale,
    config: securityTipsConfig,
    publicPath: () => "/safety",
  },
  {
    id: "quotes",
    path: "/admin/content/quotes",
    label: "Quotes",
    singular: "quote",
    icon: Quote,
    config: quotesConfig,
    publicPath: () => "/",
  },
];

export const contentType = (id: ContentType["id"]) => {
  const type = CONTENT_TYPES.find((t) => t.id === id);
  if (!type) throw new Error(`Unknown content type ${id}`);
  return type;
};
