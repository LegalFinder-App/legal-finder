import type { ReactNode } from "react";

/**
 * Minimal markdown-ish renderer for advice/news article bodies. Supports headings (#/##/###),
 * paragraphs, **bold**, *italic*, [links](url), and "- " lists. Outputs plain React elements
 * (no dangerouslySetInnerHTML), so no sanitizer dependency is needed.
 */
export function MarkdownLite({ text, className }: { text: string; className?: string }) {
  return <div className={className}>{parseBlocks(text)}</div>;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-${index++}`}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-${index++}`}>{match[2]}</em>);
    } else if (match[3] !== undefined && match[4] !== undefined) {
      nodes.push(
        <a
          key={`${keyPrefix}-${index++}`}
          href={match[4]}
          target="_blank"
          rel="noreferrer"
          className="text-brass underline underline-offset-2 hover:no-underline"
        >
          {match[3]}
        </a>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function parseBlocks(text: string): ReactNode[] {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = (key: string) => {
    if (paragraphBuffer.length === 0) return;
    blocks.push(
      <p key={key} className="leading-relaxed">
        {renderInline(paragraphBuffer.join(" "), key)}
      </p>,
    );
    paragraphBuffer = [];
  };

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc space-y-1 pl-5">
        {listBuffer.map((item, i) => (
          <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();
    const key = `b-${lineIndex}`;

    if (line === "") {
      flushParagraph(key);
      flushList(key);
      return;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushParagraph(key);
      flushList(key);
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2], key);
      if (level === 1) {
        blocks.push(
          <h2 key={key} className="font-display text-2xl font-semibold">
            {content}
          </h2>,
        );
      } else if (level === 2) {
        blocks.push(
          <h3 key={key} className="font-display text-xl font-semibold">
            {content}
          </h3>,
        );
      } else {
        blocks.push(
          <h4 key={key} className="font-display text-lg font-semibold">
            {content}
          </h4>,
        );
      }
      return;
    }

    const listMatch = /^[-*]\s+(.*)$/.exec(line);
    if (listMatch) {
      flushParagraph(key);
      listBuffer.push(listMatch[1]);
      return;
    }

    flushList(key);
    paragraphBuffer.push(line);
  });

  flushParagraph("b-last");
  flushList("b-last-list");

  return blocks;
}
