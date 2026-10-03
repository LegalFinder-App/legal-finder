// Records the App Store app preview (a 15–30 second video) from the real app.
//
//   npm run desktop:web                                  # export the app first
//   npm install --no-save playwright ffmpeg-static       # once; neither is a project dependency
//   node scripts/store-previews.mjs
//
// Like scripts/store-screenshots.mjs, it opens the desktop shell (the phone app's code), signs in
// as the store reviewers' demo client, and walks through the app the way a person would — home,
// a matter, its documents, messages, the advocate directory, the guides, and a real question to
// the assistant — while recording at 443 x 960 pt @2x, i.e. 886 x 1920.
//
// Apple's specification (App Store Connect help, "App preview specifications"): .mp4 with H.264
// up to High Profile Level 4.0, 30 fps, 10–12 Mbps; a stereo 256 kbps AAC audio track is required,
// so a silent one is added; 15 to 30 seconds; 886 x 1920 for both the 6.9" and 6.5" iPhone slots.
// Output: store-listing/previews/iphone-886x1920.mp4 (git-ignored; about 30 MB).
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "store-listing", "previews");
const OUT = path.join(OUT_DIR, "iphone-886x1920.mp4");
const WIDTH = 443; // points; at 2x this is the 886 x 1920 Apple asks for
const HEIGHT = 960;
const MIN_SECONDS = 15.5;
const MAX_SECONDS = 29.5;

let electron;
let ffmpeg;
try {
  ({ _electron: electron } = require("playwright"));
  ffmpeg = process.env.FFMPEG_PATH || require("ffmpeg-static");
} catch {
  console.error("Missing tools. Run: npm install --no-save playwright ffmpeg-static");
  process.exit(2);
}
if (!fs.existsSync(path.join(ROOT, "apps/mobile/dist/desktop/index.html"))) {
  console.error("No exported app found. Run: npm run desktop:web");
  process.exit(2);
}

const credentialsFile = path.join(ROOT, "store-listing", "reviewer-credentials.local");
if (!fs.existsSync(credentialsFile)) {
  console.error("No reviewer credentials. Run: node scripts/reviewer-accounts.mjs");
  process.exit(2);
}
const credentials = fs.readFileSync(credentialsFile, "utf8");
const email = credentials.match(/^User name:\s+(\S+)$/m)[1];
const password = credentials.match(/^Password:\s+(\S+)$/m)[1];
const secret = credentials.match(
  new RegExp(`^\\s+${email.replace(/[.+]/g, "\\$&")}:\\s+(\\S+)$`, "m"),
)[1];

function totp() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secret.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hmac = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), "lf-store-preview-"));
const profile = path.join(work, "profile");
const framesDir = path.join(work, "frames");
fs.mkdirSync(framesDir);
const launchEnv = { ...process.env, LEGALFINDER_USER_DATA: profile };
// Set by VS Code's terminal; with it Electron starts as plain Node and opens no window.
delete launchEnv.ELECTRON_RUN_AS_NODE;
delete launchEnv.LEGALFINDER_DEV_SERVER;

const app = await electron.launch({
  executablePath: require("electron"),
  args: [path.join(ROOT, "platforms/desktop/electron/main.js")],
  cwd: ROOT,
  env: launchEnv,
  timeout: 120000,
});
const frames = []; // { file, at, got } — "at": the browser's timestamp; "got": this script's clock
// Stretches of waiting to leave out of the video, on this script's clock (seconds).
const cuts = [];
const now = () => Date.now() / 1000;
try {
  const win = await app.firstWindow({ timeout: 120000 });
  const cdp = await win.context().newCDPSession(win);
  const pause = (ms) => win.waitForTimeout(ms);
  const go = async (route) => {
    await win.evaluate((r) => {
      window.location.href = "app://legalfinder" + r;
    }, route);
    await win.waitForLoadState("load").catch(() => {});
  };

  // ---- sign in, and give the AI permission in this throwaway profile, before recording
  await go("/sign-in");
  await win.getByPlaceholder("you@example.com").waitFor({ timeout: 180000 });
  await win.getByPlaceholder("you@example.com").fill(email);
  await win.getByPlaceholder("Your password").fill(password);
  await win.getByRole("button", { name: "Sign in", exact: true }).click();
  await win.getByPlaceholder("123456").waitFor({ timeout: 60000 });
  const left = 30000 - (Date.now() % 30000);
  if (left < 6000) await pause(left + 500);
  await win.getByPlaceholder("123456").fill(totp());
  await win.getByRole("button", { name: "Verify and continue" }).click();
  await win
    .getByText("Your matters")
    .filter({ visible: true })
    .first()
    .waitFor({ timeout: 120000 });
  await go("/assistant");
  const allow = win.getByRole("button", { name: "Allow and continue" });
  const composer = win.getByPlaceholder("Ask a legal question…");
  await Promise.race([allow.waitFor({ timeout: 60000 }), composer.waitFor({ timeout: 60000 })]);
  if (await allow.count()) await allow.click();

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "light" }],
  });
  // Load the advocates' photos once beforehand, so they don't pop in during the recording.
  await go("/advocates");
  await win
    .waitForFunction(
      () => document.images.length > 0 && [...document.images].every((image) => image.complete),
      null,
      { timeout: 30000 },
    )
    .catch(() => {});
  await pause(2000);
  await go("/");
  await win
    .getByText("Your matters")
    .filter({ visible: true })
    .first()
    .waitFor({ timeout: 120000 });
  // A phone shows no scrollbars or text cursor; the style survives in-app navigation.
  await win.addStyleTag({
    content:
      "*::-webkit-scrollbar{display:none!important} *{scrollbar-width:none!important;caret-color:transparent!important}",
  });
  await win.evaluate(() => document.fonts.ready);
  await pause(2500);

  // Screens underneath stay mounted, hidden, on the web build — every lookup here takes only visible
  // text, or a click lands on the hidden copy.
  // Scrolls the nearest scrollable ancestor of the element with the given text, smoothly.
  const glide = async (text, by, ms = 1400) =>
    (await onTop(text, { exact: false })).evaluate(
      (el, { by, ms }) =>
        new Promise((resolve) => {
          let box = el.parentElement;
          while (
            box &&
            !(
              box.scrollHeight > box.clientHeight + 4 &&
              /(auto|scroll)/.test(getComputedStyle(box).overflowY)
            )
          )
            box = box.parentElement;
          if (!box) return resolve();
          const from = box.scrollTop;
          const to = Math.max(0, Math.min(from + by, box.scrollHeight - box.clientHeight));
          const start = performance.now();
          const step = (now) => {
            const t = Math.min(1, (now - start) / ms);
            const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            box.scrollTop = from + (to - from) * eased;
            if (t < 1) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        }),
      { by, ms },
    );
  // The copy of a text that is on top. Screens underneath stay in the page, so a text can match
  // several elements that all count as visible; only one of them is where a finger would land.
  const onTop = async (text, options) => {
    for (const candidate of await win.getByText(text, options).all()) {
      const top = await candidate
        .evaluate((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return false;
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return Boolean(hit) && (hit === el || el.contains(hit) || hit.contains(el));
        })
        .catch(() => false);
      if (top) return candidate;
    }
    throw new Error(`"${text}" is not on screen`);
  };
  const tapText = async (text, options) => {
    const deadline = Date.now() + 30000;
    for (;;) {
      try {
        return await (await onTop(text, options)).click();
      } catch (error) {
        if (Date.now() > deadline) throw error;
        await pause(250);
      }
    }
  };
  // Back to the screen underneath (matters, conversations and profiles open over the tab bar).
  const back = async (waitFor) => {
    await win.goBack();
    await win.getByText(waitFor).filter({ visible: true }).first().waitFor({ timeout: 60000 });
    await pause(350);
  };
  const tab = async (name) => {
    const byRole = win.getByRole("tab", { name });
    if (await byRole.count()) await byRole.first().click();
    else await win.getByText(name, { exact: true }).last().click();
  };

  // ---- record
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 95,
    maxWidth: WIDTH * 2,
    maxHeight: HEIGHT * 2,
    everyNthFrame: 1,
  });
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = path.join(framesDir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, at: metadata.timestamp, got: now() });
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  // The screencast only sends a frame when something changes, so nudge one out at the start.
  await win.evaluate(() => window.scrollBy(0, 0));
  await pause(1800);

  // Home: the overview, then down to the matters
  await glide("Upcoming appointments", 520, 1500);
  await pause(900);

  // A matter: its deadlines, then its documents and the advocate's updates
  await tapText("Boundary dispute — Plot 14, Kira");
  await win
    .getByText("Survey report summary.pdf")
    .filter({ visible: true })
    .first()
    .waitFor({ timeout: 60000 });
  await pause(1100);
  await glide("Deadlines", 1250, 2000);
  await pause(1300);

  // Messages with the advocate
  await back("Your matters");
  await tab("Messages");
  await pause(900);
  await tapText("Consultation with James Okello");
  await win
    .getByText("That works for me. I will bring the original title.")
    .filter({ visible: true })
    .first()
    .waitFor({ timeout: 60000 });
  await pause(1700);

  // The advocate directory and one profile
  await back("Consultation with James Okello");
  await tab("Advocates");
  await pause(1200);
  await glide("advocates", 380, 1100);
  await pause(400);
  await tapText("Michael Okello");
  await win.getByRole("button", { name: "Book" }).first().waitFor({ timeout: 60000 });
  await pause(1600);

  // Plain-language guides
  await back("Michael Okello");
  await tab("Learn");
  await pause(1700);

  // A real question to the assistant
  await tab("Home");
  await pause(500);
  await tapText("Ask assistant", { exact: true });
  await composer.waitFor({ timeout: 60000 });
  await pause(600);
  await composer.pressSequentially("What should I check before buying land?", { delay: 45 });
  await win.getByRole("button", { name: "Ask", exact: true }).click();
  await win
    .getByText("Thinking…")
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  const thinking = now();
  await win.waitForFunction(() => !document.body.innerText.includes("Thinking…"), null, {
    timeout: 90000,
  });
  // The answer takes several seconds to arrive; the video keeps about one second of the spinner.
  cuts.push([thinking + 1.0, now() - 0.15]);
  await pause(3400);

  await cdp.send("Page.stopScreencast");
  await pause(300);
} finally {
  await app.close().catch(() => {});
}

// ---- assemble: each frame lasts until the next one, then fit Apple's 15–30 second window
if (frames.length < 10) throw new Error(`Only ${frames.length} frames were recorded`);
// The cuts are on this script's clock; frames carry the browser's. Line them up, drop the frames
// inside each cut and close the gap.
const offsets = frames.map((f) => f.got - f.at).sort((a, b) => a - b);
const offset = offsets[Math.floor(offsets.length / 2)];
const removed = cuts.map(([a, b]) => [a - offset, b - offset]).filter(([a, b]) => b > a);
const kept = frames.filter((f) => !removed.some(([a, b]) => f.at > a && f.at < b));
const shifted = (t) =>
  t - removed.filter(([, b]) => b <= t).reduce((sum, [a, b]) => sum + (b - a), 0);
const durations = kept.map((f, i) =>
  i + 1 < kept.length ? shifted(kept[i + 1].at) - shifted(f.at) : 1.2,
);
let total = durations.reduce((a, b) => a + b, 0);
const speed = total > MAX_SECONDS ? total / MAX_SECONDS : 1;
if (speed > 1) for (let i = 0; i < durations.length; i++) durations[i] /= speed;
total = durations.reduce((a, b) => a + b, 0);
if (total < MIN_SECONDS) durations[durations.length - 1] += MIN_SECONDS - total;
const list = path.join(work, "frames.txt");
fs.writeFileSync(
  list,
  kept
    .map(
      (f, i) =>
        `file '${f.file.replace(/\\/g, "/")}'\nduration ${Math.max(durations[i], 0.001).toFixed(4)}`,
    )
    .join("\n") + `\nfile '${kept[kept.length - 1].file.replace(/\\/g, "/")}'\n`,
);

fs.mkdirSync(OUT_DIR, { recursive: true });
execFileSync(
  ffmpeg,
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-vf",
    `scale=${WIDTH * 2}:${HEIGHT * 2}:flags=lanczos,fps=30,format=yuv420p`,
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-level",
    "4.0",
    "-preset",
    "slow",
    "-b:v",
    "10M",
    "-maxrate",
    "12M",
    "-bufsize",
    "20M",
    "-r",
    "30",
    "-c:a",
    "aac",
    "-b:a",
    "256k",
    "-ar",
    "44100",
    "-ac",
    "2",
    "-shortest",
    "-movflags",
    "+faststart",
    OUT,
  ],
  { stdio: "inherit" },
);
fs.rmSync(work, { recursive: true, force: true });
console.log(
  `${kept.length} frames, ${total.toFixed(1)} s${speed > 1 ? ` (played ${speed.toFixed(2)}x to fit 30 s)` : ""} → ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`,
);
