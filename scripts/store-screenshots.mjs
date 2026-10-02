// Regenerates the store screenshots in store-listing/screenshots/ from the real app.
//
//   npm run desktop:web                  # export the app first → apps/mobile/dist/desktop
//   npm install --no-save playwright     # once; it is not a project dependency
//   node scripts/store-screenshots.mjs
//
// The desktop shell runs the same code as the phone apps, so this opens it, signs in as the
// store reviewers' demo client (scripts/reviewer-accounts.mjs must have been run), and captures
// each screen at a phone's size and pixel density:
//   iPhone 6.9"   440 x 956 pt  @3x   → 1320 x 2868  (the size App Store Connect requires)
//   Android       432 x 768 dp  @2.5x → 1080 x 1920  (9:16, as Play asks for phones)
// They are renders of the app's screens, not captures from a phone: no status bar.
//
// Sign-in uses the authenticator secret from store-listing/reviewer-credentials.local, so no
// backup code is spent. The AI permission given for the assistant screenshot is stored in the
// temporary profile used here (it is kept per device), so reviewers still meet the notice.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "store-listing", "screenshots");
const SETS = [
  { dir: "iphone-6.9", width: 440, height: 956, scale: 3 },
  { dir: "android-phone", width: 432, height: 768, scale: 2.5 },
];

let electron;
try {
  ({ _electron: electron } = require("playwright"));
} catch {
  console.error("Playwright isn't installed. Run: npm install --no-save playwright");
  process.exit(2);
}
const sharp = require("sharp");
if (!fs.existsSync(path.join(ROOT, "apps/mobile/dist/desktop/index.html"))) {
  console.error("No exported app found. Run: npm run desktop:web");
  process.exit(2);
}

const readEnv = (file) =>
  Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map((line) => {
        const i = line.indexOf("=");
        return [
          line.slice(0, i),
          line
            .slice(i + 1)
            .trim()
            .replace(/^["']|["']$/g, ""),
        ];
      }),
  );
const env = readEnv(path.join(ROOT, ".env"));
const SUPABASE = env.SUPABASE_URL || env.VITE_SUPABASE_URL;

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

async function rows(query) {
  const res = await fetch(`${SUPABASE}/rest/v1/${query}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Lookup failed (${res.status}): ${query.split("?")[0]}`);
  return res.json();
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lf-store-shots-"));
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
const written = [];
try {
  const win = await app.firstWindow({ timeout: 120000 });
  const cdp = await win.context().newCDPSession(win);
  const go = async (route) => {
    await win.evaluate((r) => {
      window.location.href = "app://legalfinder" + r;
    }, route);
    await win.waitForLoadState("load").catch(() => {});
  };

  // ---- sign in the way a person does: password, then the authenticator code
  await go("/sign-in");
  await win.getByPlaceholder("you@example.com").waitFor({ timeout: 180000 });
  await win.getByPlaceholder("you@example.com").fill(email);
  await win.getByPlaceholder("Your password").fill(password);
  await win.getByRole("button", { name: "Sign in", exact: true }).click();
  await win.getByPlaceholder("123456").waitFor({ timeout: 60000 });
  // A code typed in the last seconds of its 30-second window can expire on the way.
  const left = 30000 - (Date.now() % 30000);
  if (left < 6000) await win.waitForTimeout(left + 500);
  await win.getByPlaceholder("123456").fill(totp());
  await win.getByRole("button", { name: "Verify and continue" }).click();
  await win.getByText("Your matters").first().waitFor({ timeout: 120000 });

  // ---- what to show
  const [me] = await rows(`profiles?email=eq.${encodeURIComponent(email)}&select=id`);
  const [matter] = await rows(`cases?client_id=eq.${me.id}&status=eq.hearing&select=id,title`);
  const [conversation] = await rows(
    `conversations?or=(participant_a.eq.${me.id},participant_b.eq.${me.id})&select=id,last_message`,
  );
  const [advocate] = await rows(
    "lawyers?verified=eq.true&select=id,full_name&order=rating.desc&limit=1",
  );
  if (!matter || !conversation || !advocate) {
    throw new Error(
      "The demo account's sample data is missing. Run: node scripts/reviewer-accounts.mjs",
    );
  }

  await go("/assistant");
  const allow = win.getByRole("button", { name: "Allow and continue" });
  const composer = win.getByPlaceholder("Ask a legal question…");
  await Promise.race([allow.waitFor({ timeout: 60000 }), composer.waitFor({ timeout: 60000 })]);
  if (await allow.count()) await allow.click();

  const see = (text) => () => win.getByText(text).first().waitFor({ timeout: 120000 });
  const screens = [
    { name: "01-home", route: "/", ready: see("Your matters") },
    { name: "02-advocates", route: "/advocates", ready: see(advocate.full_name) },
    {
      name: "03-advocate-profile",
      route: `/lawyers/${advocate.id}`,
      ready: () => win.getByRole("button", { name: "Book" }).first().waitFor({ timeout: 120000 }),
    },
    { name: "04-matter", route: `/cases/${matter.id}`, ready: see(matter.title) },
    {
      // The same matter, scrolled to its documents and the advocate's updates.
      name: "05-matter-documents",
      route: `/cases/${matter.id}`,
      ready: see("Case updates"),
      frame: () =>
        win
          .getByText("Documents", { exact: true })
          .first()
          .evaluate((el) => {
            el.scrollIntoView({ block: "start" });
            let scroller = el.parentElement;
            while (scroller && scroller.scrollTop === 0) scroller = scroller.parentElement;
            if (scroller) scroller.scrollTop -= 20;
          }),
    },
    {
      name: "06-messages",
      route: `/messages/${conversation.id}`,
      ready: see(conversation.last_message),
    },
    {
      name: "07-learn",
      route: "/learn",
      ready: () => win.getByPlaceholder("Search guides").waitFor({ timeout: 120000 }),
    },
    { name: "08-assistant", route: "/assistant", ready: see("Ask anything about Ugandan law") },
  ];

  for (const set of SETS) {
    const dir = path.join(OUT, set.dir);
    fs.mkdirSync(dir, { recursive: true });
    for (const old of fs.readdirSync(dir)) if (old.endsWith(".png")) fs.rmSync(path.join(dir, old));
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: set.width,
      height: set.height,
      deviceScaleFactor: set.scale,
      mobile: false,
    });
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: "light" }],
    });
    for (const screen of screens) {
      await go(screen.route);
      await screen.ready();
      // No desktop scrollbars or text cursors in a phone screenshot; let images and fonts land.
      await win
        .addStyleTag({
          content:
            "*::-webkit-scrollbar{display:none!important} *{scrollbar-width:none!important;caret-color:transparent!important}",
        })
        .catch(() => {});
      await win.evaluate(async () => {
        await document.fonts.ready;
        const pending = [...document.images].filter((image) => !image.complete);
        await Promise.all(
          pending.map(
            (image) =>
              new Promise((resolve) => {
                image.onload = image.onerror = resolve;
                setTimeout(resolve, 8000);
              }),
          ),
        );
      });
      await win.waitForTimeout(1800);
      if (screen.frame) {
        await screen.frame();
        await win.waitForTimeout(700);
      }
      // Through the debugger protocol: it honours the emulated pixel density, where Playwright's
      // own screenshot of an Electron window comes out at 1x.
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
      const file = path.join(dir, `${screen.name}.png`);
      // Opaque RGB: App Store Connect refuses images with an alpha channel.
      await sharp(Buffer.from(data, "base64"))
        .flatten({ background: "#fcfaf6" })
        .removeAlpha()
        .png({ compressionLevel: 9 })
        .toFile(file);
      const meta = await sharp(file).metadata();
      written.push(`${set.dir}/${screen.name}.png  ${meta.width} x ${meta.height}`);
    }
  }
} finally {
  await app.close().catch(() => {});
  fs.rmSync(profile, { recursive: true, force: true });
  for (const line of written) console.log(line);
}
console.log(`${written.length} screenshots written to ${path.relative(ROOT, OUT)}`);
