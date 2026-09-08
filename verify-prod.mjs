import { chromium } from "playwright";

const BASE = "https://legalfinder.vercel.app";

function log(step, detail = "") {
  console.log(`[${step}] ${detail}`);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const cspViolations = [];
page.on("console", (msg) => {
  const text = msg.text();
  if (msg.type() === "error") {
    log("console-error", text);
    if (/content security policy|refused to/i.test(text)) cspViolations.push(text);
  }
});
page.on("pageerror", (err) => log("pageerror", err.message));
page.on("response", (res) => {
  if (res.status() >= 400) log("http-error", `${res.status()} ${res.url()}`);
});

try {
  log("nav", `${BASE}/`);
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  log("home-title", await page.title());
  const homeBody = await page.locator("body").innerText();
  log("home-body-snippet", homeBody.slice(0, 200));

  log("nav", `${BASE}/auth?mode=signin`);
  await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  const hasEmailField = await page.locator("#email").count();
  log("signin-form-rendered", hasEmailField > 0 ? "YES" : "NO");
  const authBody = await page.locator("body").innerText();
  log("auth-body-snippet", authBody.slice(0, 300));

  log("csp-violations", JSON.stringify(cspViolations));
} catch (err) {
  log("ERROR", err.stack || err.message);
} finally {
  await page.screenshot({ path: "verify-prod-auth.png" }).catch(() => {});
  await browser.close();
}
