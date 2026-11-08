#!/usr/bin/env node
// Mirrors src/design/tokens.css into src/design/tokens.json so the Expo app (React Native has no
// oklch() or CSS variables) can use the same palette, radii, type scale and motion values.
// Run after editing tokens.css: `npm run tokens:export`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssPath = path.join(root, "src/design/tokens.css");
const outPath = path.join(root, "src/design/tokens.json");
const css = fs.readFileSync(cssPath, "utf8");

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No "${selector}" block in tokens.css`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(css.indexOf("{", start) + 1, i);
  }
  throw new Error(`Unclosed "${selector}" block`);
}

function vars(body) {
  const out = {};
  // Declarations may span lines (gradients, shadows); split on ";" at depth 0.
  for (const decl of body.replace(/\/\*[\s\S]*?\*\//g, "").split(/;\s*/)) {
    const m = decl.trim().match(/^--([\w-]+):\s*([\s\S]+)$/);
    if (m) out[m[1]] = m[2].replace(/\s+/g, " ").trim();
  }
  return out;
}

// OKLCH → sRGB hex (Björn Ottosson's OKLab matrices).
function oklchToHex(value) {
  const m = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/);
  if (!m) return null;
  const [L, C, H] = [Number(m[1]), Number(m[2]), (Number(m[3]) * Math.PI) / 180];
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  const hex = lin
    .map((c) => {
      const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("");
  let alpha = "";
  if (m[4]) {
    const a01 = m[4].endsWith("%") ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
    alpha = Math.round(a01 * 255)
      .toString(16)
      .padStart(2, "0");
  }
  return `#${hex}${alpha}`;
}

function colours(all) {
  const out = {};
  for (const [k, v] of Object.entries(all)) {
    const hex = oklchToHex(v);
    if (hex) out[k] = { hex, oklch: v };
  }
  return out;
}

const light = vars(block(":root"));
const dark = vars(block(".dark"));
const scale = vars(block("@theme"));
const pick = (obj, prefix) =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => [k.slice(prefix.length), v]),
  );

const tokens = {
  $source: "src/design/tokens.css — regenerate with `npm run tokens:export`",
  color: { light: colours(light), dark: colours(dark) },
  radius: {
    base: light.radius,
    sm: "base - 4px",
    md: "base - 2px",
    lg: "base",
    xl: "base + 4px",
    "2xl": "base + 8px",
    "3xl": "base + 12px",
    "4xl": "base + 20px",
    full: "9999px",
  },
  // Tailwind's 4px spacing step (p-1 = 4px, p-2 = 8px, …).
  spacing: { unit: "4px", scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] },
  font: {
    sans: "Plus Jakarta Sans (variable 200–800)",
    serif: "Fraunces italic (accent words only)",
    mono: "IBM Plex Mono 400/500",
  },
  type: pick(scale, "text-"),
  motion: {
    duration: {
      fast: light["duration-fast"],
      base: light["duration-base"],
      slow: light["duration-slow"],
    },
    easing: {
      "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      standard: "cubic-bezier(0.2, 0, 0, 1)",
    },
  },
  shadow: { light: pick(light, "shadow-"), dark: pick(dark, "shadow-") },
};

fs.writeFileSync(outPath, `${JSON.stringify(tokens, null, 2)}\n`);
console.log(
  `Wrote ${path.relative(root, outPath)} (${Object.keys(tokens.color.light).length} light / ${Object.keys(tokens.color.dark).length} dark colours)`,
);
