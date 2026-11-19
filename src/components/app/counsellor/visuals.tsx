import { useEffect, useId, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  isSafeHttpsImageUrl,
  sanitizeCounsellorSvg,
} from "@/lib/assistant-visuals";
import { cn } from "@/lib/utils";

export { isSafeHttpsImageUrl, sanitizeCounsellorSvg };

export function MermaidBlock({ code, className }: { code: string; className?: string }) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
          fontFamily: "inherit",
        });
        const id = `counsellor-mmd-${reactId}-${Math.random().toString(36).slice(2, 7)}`;
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSvg(null);
          setError(err instanceof Error ? err.message : "Could not render diagram.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, reactId]);

  if (error) {
    return (
      <pre
        className={cn(
          "overflow-x-auto rounded-xl border border-border/80 bg-secondary/40 p-3 text-xs text-muted-foreground",
          className,
        )}
      >
        {code}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div
        className={cn(
          "h-28 animate-pulse rounded-xl border border-border/70 bg-secondary/40",
          className,
        )}
        aria-busy="true"
        aria-label="Rendering diagram"
      />
    );
  }

  return (
    <figure
      className={cn(
        "overflow-x-auto rounded-xl border border-border/80 bg-card/80 p-3 shadow-sm",
        className,
      )}
    >
      <div
        className="counsellor-mermaid [&_svg]:mx-auto [&_svg]:max-w-full"
        // Sanitized by mermaid securityLevel:strict; still only from our model fence.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="mt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Illustrative diagram · not an official form
      </figcaption>
    </figure>
  );
}

export function SvgBlock({ code, className }: { code: string; className?: string }) {
  const safe = sanitizeCounsellorSvg(code);
  if (!safe) {
    return (
      <pre
        className={cn(
          "overflow-x-auto rounded-xl border border-border/80 bg-secondary/40 p-3 text-xs text-muted-foreground",
          className,
        )}
      >
        {code}
      </pre>
    );
  }
  return (
    <figure
      className={cn(
        "overflow-x-auto rounded-xl border border-border/80 bg-card/80 p-3 shadow-sm",
        className,
      )}
    >
      <div
        className="[&_svg]:mx-auto [&_svg]:max-h-80 [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
      <figcaption className="mt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Illustrative diagram · not an official form
      </figcaption>
    </figure>
  );
}

export function ExternalImageFigure({
  alt,
  src,
  className,
}: {
  alt: string;
  src: string;
  className?: string;
}) {
  if (!isSafeHttpsImageUrl(src)) {
    return (
      <p className="text-sm text-muted-foreground">
        Skipped unsafe image link{alt ? `: ${alt}` : ""}.
      </p>
    );
  }
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border border-border/80 bg-secondary/30 shadow-sm",
        className,
      )}
    >
      <img
        src={src}
        alt={alt || "External figure from web search"}
        className="max-h-80 w-full object-contain bg-background"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <figcaption className="flex items-center justify-between gap-2 border-t border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
        <span>External image · not LegalFinder</span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-brass hover:underline"
        >
          Open original <ExternalLink className="h-3 w-3" />
        </a>
      </figcaption>
    </figure>
  );
}

export function WebSourceChip({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/80 bg-secondary/50 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-brass/40 hover:text-foreground"
    >
      <span className="truncate">{title}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
    </a>
  );
}
