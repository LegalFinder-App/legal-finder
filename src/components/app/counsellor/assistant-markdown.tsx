import type { ReactNode } from "react";
import { AlertTriangle, Info, Scale } from "lucide-react";
import type { CounsellorSource, SourceKind } from "@/lib/assistant-sources";
import { cn } from "@/lib/utils";
import { CitationInline } from "./citation";
import { ExternalImageFigure, MermaidBlock, SvgBlock } from "./visuals";

type MarkdownContext = {
  sources?: CounsellorSource[];
  onOpenSource?: (source: CounsellorSource) => void;
  citeOrder: Map<string, number>;
};

/**
 * Professional Markdown renderer for Counsellor AI replies. Safe React elements only (no
 * dangerouslySetInnerHTML). Extends the article MarkdownLite dialect with tables, callouts,
 * ordered lists, legal-reference highlighting, and [[cite:kind:id]] tokens.
 */
export function AssistantMarkdown({
  text,
  className,
  sources,
  onOpenSource,
}: {
  text: string;
  className?: string;
  sources?: CounsellorSource[];
  onOpenSource?: (source: CounsellorSource) => void;
}) {
  const ctx: MarkdownContext = {
    sources,
    onOpenSource,
    citeOrder: new Map(),
  };
  return (
    <div className={cn("counsellor-prose space-y-3 text-[15px] leading-[1.7]", className)}>
      {parseBlocks(text, ctx)}
    </div>
  );
}

function citeKey(kind: string, id: string) {
  return `${kind}:${id}`;
}

function renderInline(text: string, keyPrefix: string, ctx: MarkdownContext): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Citations first, then links/bold/italic, then bare Act/Cap./Art. style cues.
  const regex =
    /!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)|\[\[cite:(advice|judgment|library|news):([a-zA-Z0-9_-]+)\]\]|\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)|(\b(?:Art(?:icle)?\.?\s*\d+[A-Za-z0-9.-]*|Cap\.?\s*\d+|Act\s+No\.?\s*\d+|\d{4}\s+[A-Z][A-Za-z\s]{2,40}Act)\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined && match[2] !== undefined) {
      nodes.push(
        <span key={`${keyPrefix}-img-${index++}`} className="my-2 block">
          <ExternalImageFigure alt={match[1]} src={match[2]} />
        </span>,
      );
    } else if (match[3] !== undefined && match[4] !== undefined) {
      const kind = match[3] as SourceKind;
      const id = match[4];
      const source = ctx.sources?.find((s) => s.kind === kind && s.id === id);
      const key = citeKey(kind, id);
      if (!ctx.citeOrder.has(key)) ctx.citeOrder.set(key, ctx.citeOrder.size + 1);
      const n = ctx.citeOrder.get(key) ?? 1;
      if (source && ctx.onOpenSource) {
        nodes.push(
          <CitationInline
            key={`${keyPrefix}-c-${index++}`}
            source={source}
            index={n}
            onOpen={ctx.onOpenSource}
          />,
        );
      } else {
        nodes.push(
          <sup
            key={`${keyPrefix}-c-${index++}`}
            className="ml-0.5 rounded bg-secondary px-1 text-[10px] font-semibold text-muted-foreground"
          >
            [{n}]
          </sup>,
        );
      }
    } else if (match[5] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b-${index++}`}>{match[5]}</strong>);
    } else if (match[6] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i-${index++}`}>{match[6]}</em>);
    } else if (match[7] !== undefined && match[8] !== undefined) {
      const href = match[8];
      const external = href.startsWith("http");
      nodes.push(
        <a
          key={`${keyPrefix}-a-${index++}`}
          href={href}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          className="font-medium text-brass underline underline-offset-2 hover:no-underline"
        >
          {match[7]}
        </a>,
      );
    } else if (match[9] !== undefined) {
      nodes.push(
        <span
          key={`${keyPrefix}-l-${index++}`}
          className="rounded-sm bg-brass/10 px-1 py-0.5 font-medium text-foreground"
        >
          {match[9]}
        </span>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

type ListKind = "ul" | "ol";

function parseBlocks(text: string, ctx: MarkdownContext): ReactNode[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let listBuffer: string[] = [];
  let listKind: ListKind = "ul";
  let paragraphBuffer: string[] = [];
  let tableBuffer: string[] = [];

  const flushParagraph = (key: string) => {
    if (paragraphBuffer.length === 0) return;
    blocks.push(
      <p key={key} className="text-foreground/90">
        {renderInline(paragraphBuffer.join(" "), key, ctx)}
      </p>,
    );
    paragraphBuffer = [];
  };

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    const ListTag = listKind === "ol" ? "ol" : "ul";
    const listClass =
      listKind === "ol"
        ? "list-decimal space-y-1.5 pl-5 text-foreground/90"
        : "list-disc space-y-1.5 pl-5 text-foreground/90";
    blocks.push(
      <ListTag key={key} className={listClass}>
        {listBuffer.map((item, i) => (
          <li key={`${key}-${i}`} className="leading-relaxed pl-0.5">
            {renderInline(item, `${key}-${i}`, ctx)}
          </li>
        ))}
      </ListTag>,
    );
    listBuffer = [];
    listKind = "ul";
  };

  const flushTable = (key: string) => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer
      .filter((row) => !/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(row.trim()))
      .map((row) =>
        row
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim()),
      );
    tableBuffer = [];
    if (rows.length === 0) return;
    const [header, ...body] = rows;
    blocks.push(
      <div key={key} className="overflow-x-auto rounded-xl border border-border/80 bg-card/60">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-secondary/60">
            <tr>
              {header.map((cell, i) => (
                <th
                  key={`${key}-h-${i}`}
                  className="whitespace-nowrap px-3 py-2 font-semibold text-foreground"
                >
                  {renderInline(cell, `${key}-h-${i}`, ctx)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={`${key}-r-${ri}`} className="border-t border-border/70">
                {row.map((cell, ci) => (
                  <td key={`${key}-r-${ri}-${ci}`} className="px-3 py-2 text-foreground/90">
                    {renderInline(cell, `${key}-r-${ri}-${ci}`, ctx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
  };

  let fenceLang: string | null = null;
  let fenceLines: string[] = [];

  const flushFence = (key: string) => {
    if (fenceLang === null) return;
    const code = fenceLines.join("\n");
    const lang = fenceLang.toLowerCase();
    fenceLang = null;
    fenceLines = [];
    if (lang === "mermaid") {
      blocks.push(<MermaidBlock key={key} code={code} />);
      return;
    }
    if (lang === "svg") {
      blocks.push(<SvgBlock key={key} code={code} />);
      return;
    }
    blocks.push(
      <pre
        key={key}
        className="overflow-x-auto rounded-xl border border-border/80 bg-secondary/40 p-3 text-xs text-muted-foreground"
      >
        {code}
      </pre>,
    );
  };

  lines.forEach((rawLine, lineIndex) => {
    const key = `b-${lineIndex}`;
    const fenceOpen = /^```([\w-]*)\s*$/.exec(rawLine.trim());
    if (fenceLang !== null) {
      if (fenceOpen && fenceOpen[1] === "") {
        flushFence(key);
        return;
      }
      fenceLines.push(rawLine);
      return;
    }
    if (fenceOpen) {
      flushParagraph(key);
      flushList(key);
      flushTable(key);
      fenceLang = fenceOpen[1] || "text";
      fenceLines = [];
      return;
    }

    const line = rawLine.trim();

    if (line === "") {
      flushParagraph(key);
      flushList(key);
      flushTable(key);
      return;
    }

    const loneImage = /^!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)$/.exec(line);
    if (loneImage) {
      flushParagraph(key);
      flushList(key);
      flushTable(key);
      blocks.push(
        <ExternalImageFigure key={key} alt={loneImage[1]} src={loneImage[2]} />,
      );
      return;
    }

    if (line.includes("|") && line.split("|").length >= 3) {
      flushParagraph(key);
      flushList(key);
      tableBuffer.push(line);
      return;
    }
    if (tableBuffer.length > 0) flushTable(`${key}-tbl`);

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushParagraph(key);
      flushList(key);
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2], key, ctx);
      const headingClass =
        level === 1
          ? "font-display text-xl font-semibold tracking-tight text-foreground"
          : level === 2
            ? "font-display text-lg font-semibold tracking-tight text-foreground"
            : "font-display text-base font-semibold text-foreground";
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      blocks.push(
        <Tag key={key} className={cn(headingClass, "mt-1")}>
          {content}
        </Tag>,
      );
      return;
    }

    const calloutMatch = /^(?:>\s*)?(?:\[!(WARNING|INFO|NOTE|LEGAL)\]|⚠️|ℹ️)\s*(.*)$/i.exec(line);
    const quoteMatch = /^>\s?(.*)$/.exec(line);
    if (calloutMatch || (quoteMatch && /^(warning|note|important):/i.test(quoteMatch[1]))) {
      flushParagraph(key);
      flushList(key);
      const kind = (calloutMatch?.[1] ?? "NOTE").toUpperCase();
      const body =
        calloutMatch?.[2] || quoteMatch?.[1].replace(/^(warning|note|important):\s*/i, "");
      const isWarning = kind === "WARNING" || /^warning:/i.test(quoteMatch?.[1] ?? "");
      const isLegal = kind === "LEGAL";
      const Icon = isWarning ? AlertTriangle : isLegal ? Scale : Info;
      blocks.push(
        <aside
          key={key}
          className={cn(
            "flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed",
            isWarning
              ? "border-amber-500/30 bg-amber-500/8 text-foreground"
              : isLegal
                ? "border-brass/35 bg-brass/8 text-foreground"
                : "border-border/80 bg-secondary/50 text-foreground/90",
          )}
        >
          <Icon
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              isWarning ? "text-amber-600" : isLegal ? "text-brass" : "text-muted-foreground",
            )}
            aria-hidden
          />
          <div>{renderInline(body || "", key, ctx)}</div>
        </aside>,
      );
      return;
    }

    if (quoteMatch) {
      flushParagraph(key);
      flushList(key);
      blocks.push(
        <blockquote
          key={key}
          className="border-l-[3px] border-brass/55 pl-3.5 text-[0.95em] italic text-muted-foreground"
        >
          {renderInline(quoteMatch[1], key, ctx)}
        </blockquote>,
      );
      return;
    }

    const hrMatch = /^(?:-{3,}|\*{3,}|_{3,})$/.exec(line);
    if (hrMatch) {
      flushParagraph(key);
      flushList(key);
      blocks.push(<hr key={key} className="border-border/70" />);
      return;
    }

    const unorderedMatch = /^[-*]\s+(.*)$/.exec(line);
    if (unorderedMatch) {
      flushParagraph(key);
      if (listBuffer.length > 0 && listKind !== "ul") flushList(`${key}-switch`);
      listKind = "ul";
      listBuffer.push(unorderedMatch[1]);
      return;
    }

    const orderedMatch = /^\d+[.)]\s+(.*)$/.exec(line);
    if (orderedMatch) {
      flushParagraph(key);
      if (listBuffer.length > 0 && listKind !== "ol") flushList(`${key}-switch`);
      listKind = "ol";
      listBuffer.push(orderedMatch[1]);
      return;
    }

    flushList(key);
    paragraphBuffer.push(line);
  });

  flushFence("b-last-fence");
  flushParagraph("b-last");
  flushList("b-last-list");
  flushTable("b-last-table");

  return blocks;
}
