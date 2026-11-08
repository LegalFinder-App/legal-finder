import type { PointerEvent } from "react";

const MAX_TILT = 5; // degrees — enough to feel physical, never enough to blur text

function reducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Pointer handlers for the `tilt-card` utility: a gentle 3D tilt toward the cursor plus the
 * --mx/--my position its border glow follows. Mouse only — touch and reduced motion get the
 * flat card. Writes CSS variables straight to the element, so it never re-renders React.
 */
export const tiltHandlers = {
  onPointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || reducedMotion()) return;
    const el = event.currentTarget;
    const r = el.getBoundingClientRect();
    const x = event.clientX - r.left;
    const y = event.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    el.style.setProperty("--ry", `${((x / r.width - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - y / r.height) * 2 * MAX_TILT).toFixed(2)}deg`);
  },
  onPointerLeave(event: PointerEvent<HTMLElement>) {
    const el = event.currentTarget;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  },
};
