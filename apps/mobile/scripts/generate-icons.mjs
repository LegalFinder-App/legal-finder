// Builds the app's icon set from the web's brand logo (public/legalfinder-logo.png). Needs the web
// app's dependencies installed — `sharp` is resolved from the repo root, not from apps/mobile:
//   node apps/mobile/scripts/generate-icons.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const sharp = createRequire(join(root, "package.json"))("sharp");
const out = (name) => join(here, "..", "assets", name);
const SOURCE = join(root, "public", "legalfinder-logo.png");

// The source is the round seal above a "LegalFinder" wordmark on white; keep only the seal.
const top = await sharp(SOURCE).extract({ left: 0, top: 0, width: 1000, height: 790 }).png().toBuffer();
const seal = await sharp(top).trim({ threshold: 15 }).png().toBuffer();

async function circleCut(size) {
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);
  return sharp(seal).resize(size, size).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

async function onCanvas(size, inner, background) {
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: await circleCut(inner), gravity: "center" }])
    .png();
}

// Seal pixels (dark line art + red stars) become opaque white; the paper becomes transparent.
async function silhouette(size, inner) {
  const art = await sharp(await circleCut(inner)).flatten({ background: "#ffffff" }).grayscale().negate().threshold(60).toColourspace("b-w").raw().toBuffer({ resolveWithObject: true });
  const alpha = await sharp(art.data, { raw: { width: inner, height: inner, channels: 1 } }).png().toBuffer();
  const glyph = await sharp({ create: { width: inner, height: inner, channels: 3, background: "#ffffff" } }).joinChannel(alpha).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: glyph, gravity: "center" }])
    .png();
}

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

await (await onCanvas(1024, 820, WHITE)).toFile(out("icon.png"));
// Android adaptive icons crop to the middle ~66%, so the seal sits well inside that.
await (await onCanvas(1024, 600, CLEAR)).toFile(out("android-icon-foreground.png"));
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: WHITE } }).png().toFile(out("android-icon-background.png"));
await (await silhouette(1024, 600)).toFile(out("android-icon-monochrome.png"));
await (await onCanvas(1024, 1000, CLEAR)).toFile(out("splash-icon.png"));
// The seal's fine line-work breaks up at status-bar size, so the notification glyph is the bold
// scales mark from the web header logo (lucide "scale"), white on transparent as Android requires.
const scales = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="-2 -2 28 28" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`;
await sharp(Buffer.from(scales)).png().toFile(out("notification-icon.png"));
await (await onCanvas(196, 180, WHITE)).toFile(out("favicon.png"));

console.log("icons written to apps/mobile/assets");
