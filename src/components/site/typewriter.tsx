import { useEffect, useRef, useState } from "react";
import { heroFx } from "@/lib/motion";
import { cn } from "@/lib/utils";

const TYPE_MS = 55;
const DELETE_MS = 26;
const HOLD_MS = 3200;
const FIRST_HOLD_MS = 4200;

/**
 * Types a set of phrases in turn, with a blinking caret. The first phrase is rendered on the
 * server and is what screen readers and search engines get; the typing is visual only. Every
 * phrase is laid out invisibly in the same cell so the line never changes height while typing
 * (no layout shift on any width). Static under reduced motion; pauses off-screen.
 */
export function Typewriter({ phrases, className }: { phrases: string[]; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(phrases[0] ?? "");
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || phrases.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(el);

    let index = 0;
    let pos = phrases[0].length;
    let deleting = true;
    let timer = 0;
    setTyping(true);

    const tick = () => {
      if (!visible || document.hidden) {
        timer = window.setTimeout(tick, 600);
        return;
      }
      const word = phrases[index];
      if (deleting && pos >= word.length) {
        // About to start a new round: wait for the dust effect to settle first.
        if (heroFx.dust) {
          timer = window.setTimeout(tick, 300);
          return;
        }
        heroFx.typing = true;
      }
      if (deleting) {
        pos -= 1;
        setText(word.slice(0, pos));
        if (pos <= 0) {
          deleting = false;
          index = (index + 1) % phrases.length;
          timer = window.setTimeout(tick, 380);
          return;
        }
        timer = window.setTimeout(tick, DELETE_MS);
        return;
      }
      pos += 1;
      setText(word.slice(0, pos));
      if (pos >= word.length) {
        deleting = true;
        heroFx.typing = false;
        timer = window.setTimeout(tick, HOLD_MS);
        return;
      }
      // A little irregularity reads as typing rather than a ticker.
      timer = window.setTimeout(tick, TYPE_MS + Math.random() * 50);
    };
    timer = window.setTimeout(tick, FIRST_HOLD_MS);

    return () => {
      heroFx.typing = false;
      window.clearTimeout(timer);
      io.disconnect();
    };
  }, [phrases]);

  return (
    <span ref={ref} className={cn("grid", className)}>
      <span className="sr-only">{phrases[0]}</span>
      {phrases.map((p) => (
        <span key={p} aria-hidden className="invisible col-start-1 row-start-1">
          {p}
        </span>
      ))}
      <span aria-hidden className="col-start-1 row-start-1">
        {text}
        <span
          className={cn(
            "ml-[0.08em] inline-block h-[0.82em] w-[0.06em] min-w-[2px] translate-y-[0.08em] rounded-full bg-brass align-baseline",
            typing ? "animate-caret" : "opacity-0",
          )}
        />
      </span>
    </span>
  );
}
