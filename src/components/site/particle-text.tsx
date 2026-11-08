import { useEffect, useRef } from "react";
import { heroFx } from "@/lib/motion";
import { cn } from "@/lib/utils";

const HOLD_MS = 5200;
const GAP_MS = 350;
const SWEEP_S = 0.75; // how long the effect takes to travel from the first letter to the last
const FLIGHT_S = 1.05; // one particle's flight
const GOLD = "#e2b65c";

type Particles = {
  tx: Float32Array;
  ty: Float32Array;
  sx: Float32Array;
  sy: Float32Array;
  delay: Float32Array;
  wobble: Float32Array;
  gold: Uint8Array;
  count: number;
  size: number;
  color: string;
};

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t * t;

/**
 * A line of text that every few seconds blows away as dust and streams back into place.
 * The real text stays in the DOM (headings, SEO, screen readers); a canvas drawn from the
 * text's own laid-out glyph positions plays the effect on top, so wrapping on any screen
 * width matches exactly. Skipped entirely under reduced motion, paused off-screen.
 */
export function ParticleText({ children, className }: { children: string; className?: string }) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !text || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particles | null = null;
    let padX = 0;
    let padY = 0;
    let cw = 0;
    let ch = 0;
    let raf = 0;
    let timer = 0;
    let visible = true;
    let animating = false;
    let disposed = false;

    const build = () => {
      const node = text.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const box = wrap.getBoundingClientRect();
      if (box.width === 0) return;
      const cs = getComputedStyle(text);
      const fontSize = parseFloat(cs.fontSize);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Stay inside the nearest clipping ancestor (the hero card), so dust fades out before
      // its edge instead of being cut off in a hard line.
      let room = 220;
      for (let a = wrap.parentElement; a; a = a.parentElement) {
        if (getComputedStyle(a).overflowX !== "visible") {
          room = box.left - a.getBoundingClientRect().left;
          break;
        }
      }
      padX = Math.max(0, Math.min(220, box.width * 0.3, room));
      padY = Math.round(fontSize * 0.5);
      cw = Math.ceil(box.width + padX * 2);
      ch = Math.ceil(box.height + padY * 2);
      canvas.width = Math.ceil(cw * dpr);
      canvas.height = Math.ceil(ch * dpr);
      Object.assign(canvas.style, {
        left: `${-padX}px`,
        top: `${-padY}px`,
        width: `${cw}px`,
        height: `${ch}px`,
        // Dust fades out instead of being cut off at the canvas edge.
        maskImage: `linear-gradient(90deg, transparent, #000 ${padX * 0.85}px, #000 calc(100% - ${padX * 0.4}px), transparent)`,
      });

      // Draw each glyph where the browser actually laid it out, then sample its pixels.
      const off = document.createElement("canvas");
      off.width = canvas.width;
      off.height = canvas.height;
      const o = off.getContext("2d", { willReadFrequently: true });
      if (!o) return;
      o.scale(dpr, dpr);
      o.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      o.fillStyle = "#000";
      o.textBaseline = "alphabetic";
      const m = o.measureText("Hg");
      const asc = m.fontBoundingBoxAscent || fontSize * 0.8;
      const desc = m.fontBoundingBoxDescent || fontSize * 0.2;
      const content = node.textContent ?? "";
      const range = document.createRange();
      for (let i = 0; i < content.length; i++) {
        if (content[i].trim() === "") continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getClientRects()[0];
        if (!r) continue;
        const x = r.left - box.left + padX;
        const y = r.top - box.top + padY + (r.height - (asc + desc)) / 2 + asc;
        o.fillText(content[i], x, y);
      }

      const data = o.getImageData(0, 0, off.width, off.height).data;
      // Fine dust: a speck every 1.25–1.5 px, capped so phones keep 60 fps.
      let step = fontSize >= 56 ? 1.5 : 1.25;
      const pick = () => {
        const pts: number[] = [];
        const stride = step * dpr;
        for (let y = 0; y < off.height; y += stride) {
          for (let x = 0; x < off.width; x += stride) {
            if (data[(Math.floor(y) * off.width + Math.floor(x)) * 4 + 3] > 110)
              pts.push(x / dpr, y / dpr);
          }
        }
        return pts;
      };
      let pts = pick();
      while (pts.length / 2 > 14000 && step < 4) {
        step += 0.25;
        pts = pick();
      }

      const count = pts.length / 2;
      const p: Particles = {
        tx: new Float32Array(count),
        ty: new Float32Array(count),
        sx: new Float32Array(count),
        sy: new Float32Array(count),
        delay: new Float32Array(count),
        wobble: new Float32Array(count),
        gold: new Uint8Array(count),
        count,
        size: step * 0.95,
        color: cs.color,
      };
      const textW = box.width || 1;
      for (let i = 0; i < count; i++) {
        const tx = pts[i * 2];
        const ty = pts[i * 2 + 1];
        const along = Math.max(0, Math.min(1, (tx - padX) / textW));
        p.tx[i] = tx;
        p.ty[i] = ty;
        // Scattered position: blown off to the left in a loose, slightly rising stream.
        // Scattered position: a long, thin trail blown off to the left, thicker near the text.
        const reach = Math.random() ** 0.7;
        p.sx[i] = tx - (40 + reach * (padX + textW * 0.65));
        p.sy[i] = ty + (Math.random() - 0.5) * fontSize * (0.25 + reach * 0.35);
        p.delay[i] = along * SWEEP_S + Math.random() * 0.18;
        p.wobble[i] = Math.random() * Math.PI * 2;
        p.gold[i] = Math.random() < 0.16 ? 1 : 0;
      }
      particles = p;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (mode: "out" | "in", t: number) => {
      const p = particles;
      if (!p) return true;
      ctx.clearRect(0, 0, cw, ch);
      let done = true;
      // Specks fade as they drift: three opacity bands, drawn per colour to keep state changes few.
      for (const gold of [0, 1]) {
        ctx.fillStyle = gold ? GOLD : p.color;
        for (let band = 0; band < 3; band++) {
          ctx.globalAlpha = band === 0 ? 1 : band === 1 ? 0.7 : 0.38;
          for (let i = 0; i < p.count; i++) {
            if (p.gold[i] !== gold) continue;
            const k = Math.min(1, Math.max(0, (t - p.delay[i]) / FLIGHT_S));
            if (k < 1) done = false;
            // 0 = in place, 1 = scattered
            const s = mode === "out" ? easeIn(k) : 1 - easeOut(k);
            if ((s < 0.34 ? 0 : s < 0.67 ? 1 : 2) !== band) continue;
            const sway = Math.sin(p.wobble[i] + t * 5) * 3 * s;
            const x = p.tx[i] + (p.sx[i] - p.tx[i]) * s;
            const y = p.ty[i] + (p.sy[i] - p.ty[i]) * s + sway;
            const size = p.size * (1 - s * 0.45);
            ctx.fillRect(x, y, size, size);
          }
        }
      }
      ctx.globalAlpha = 1;
      return done;
    };

    const play = (mode: "out" | "in", onDone: () => void) => {
      const start = performance.now();
      animating = true;
      const frame = (now: number) => {
        if (disposed) return;
        const finished = draw(mode, (now - start) / 1000);
        if (finished) {
          animating = false;
          onDone();
        } else raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    const cycle = () => {
      if (disposed) return;
      if (!visible || document.hidden || !particles) {
        timer = window.setTimeout(cycle, 800);
        return;
      }
      if (heroFx.typing) {
        timer = window.setTimeout(cycle, 300);
        return;
      }
      heroFx.dust = true;
      // Hand over from the crisp text to particles in the same place, then blow them away.
      draw("out", 0);
      canvas.style.opacity = "1";
      text.style.opacity = "0";
      play("out", () => {
        timer = window.setTimeout(() => {
          play("in", () => {
            text.style.opacity = "1";
            canvas.style.opacity = "0";
            heroFx.dust = false;
            timer = window.setTimeout(cycle, HOLD_MS);
          });
        }, GAP_MS);
      });
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(wrap);

    let resizeTimer = 0;
    let lastWidth = 0;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w === lastWidth) return;
      lastWidth = w;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (animating) {
          // Mid-effect resize: settle on the crisp text and pick up at the next cycle.
          cancelAnimationFrame(raf);
          animating = false;
          window.clearTimeout(timer);
          text.style.opacity = "1";
          canvas.style.opacity = "0";
          heroFx.dust = false;
          timer = window.setTimeout(cycle, HOLD_MS);
        }
        build();
      }, 150);
    });

    void document.fonts.ready.then(() => {
      if (disposed) return;
      build();
      ro.observe(wrap);
      timer = window.setTimeout(cycle, 2600);
    });

    return () => {
      disposed = true;
      heroFx.dust = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.clearTimeout(resizeTimer);
      io.disconnect();
      ro.disconnect();
      text.style.opacity = "";
    };
  }, [children]);

  return (
    <span ref={wrapRef} className={cn("relative block", className)}>
      <span ref={textRef} className="transition-opacity duration-300 ease-out">
        {children}
      </span>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute opacity-0 transition-opacity duration-300"
      />
    </span>
  );
}
