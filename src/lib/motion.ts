import type { CSSProperties, PointerEvent } from "react";

/** Inline style for the staggered `animate-rise` / `reveal` utilities (styles.css). */
export const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

/** Feeds the pointer position to the `spotlight` utility as --mx / --my. */
export function trackSpotlight(event: PointerEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  el.style.setProperty("--my", `${event.clientY - rect.top}px`);
}

/**
 * The hero's two text effects (ParticleText, Typewriter) take turns: each sets its flag while
 * animating and waits while the other's is up, so the heading is never blank all at once.
 */
export const heroFx = { dust: false, typing: false };
