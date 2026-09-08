// Generates the PWA icon set and the shared cross-platform icon source from the one logo the
// project already has. Run with `node scripts/generate-app-icons.mjs` whenever
// public/legalfinder-logo.png changes. Mobile (Capacitor) and desktop (electron-builder) icon
// sets are generated separately by their own platform tooling from platforms/shared/icons/source-icon.png
// — this script only produces what those tools need as input, plus the web/PWA manifest icons.
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(root, "public", "legalfinder-logo.png");
const iconsDir = path.join(root, "public", "icons");
const sharedIconsDir = path.join(root, "platforms", "shared", "icons");
const THEME_BG = "#1a2338";

mkdirSync(iconsDir, { recursive: true });
mkdirSync(sharedIconsDir, { recursive: true });

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(source)
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(path.join(iconsDir, `icon-${size}.png`));
  console.log(`wrote public/icons/icon-${size}.png`);
}

// Maskable icon: Android/PWA safe-zone convention wants the artwork inside the middle ~80% of
// the canvas so OS icon masks (circle, squircle, etc.) never clip it — pad onto the theme
// background instead of cropping.
const maskableSize = 512;
const artworkSize = Math.round(maskableSize * 0.8);
await sharp(source)
  .resize(artworkSize, artworkSize, { fit: "cover" })
  .toBuffer()
  .then((artwork) =>
    sharp({
      create: {
        width: maskableSize,
        height: maskableSize,
        channels: 4,
        background: THEME_BG,
      },
    })
      .composite([{ input: artwork, gravity: "center" }])
      .png()
      .toFile(path.join(iconsDir, "icon-512-maskable.png")),
  );
console.log("wrote public/icons/icon-512-maskable.png");

// Canonical 1024x1024 source every platform's own icon generator (Capacitor assets,
// electron-builder) reads from.
await sharp(source)
  .resize(1024, 1024, { fit: "cover" })
  .png()
  .toFile(path.join(sharedIconsDir, "source-icon.png"));
console.log("wrote platforms/shared/icons/source-icon.png");

copyFileSync(source, path.join(sharedIconsDir, "source-icon-original.png"));
console.log("copied original logo alongside as source-icon-original.png for reference");

// Windows desktop icon, generated locally rather than relying on electron-builder's own
// PNG->ico auto-conversion — that downloads a winCodeSign helper tool on first use, which timed
// out in this environment. macOS's icns conversion runs through the OS's built-in iconutil when
// built on a real Mac, so it doesn't need an equivalent here.
const icoBuffer = await pngToIco(path.join(sharedIconsDir, "source-icon.png"));
writeFileSync(path.join(sharedIconsDir, "icon.ico"), icoBuffer);
console.log("wrote platforms/shared/icons/icon.ico");
