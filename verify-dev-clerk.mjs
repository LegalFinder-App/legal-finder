import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3002";

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning")
    console.log(`[${msg.type()}]`, msg.text());
});
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(5000);
console.log("[url]", page.url());
const hasEmail = await page.locator("#email").count();
console.log("[signin-form]", hasEmail > 0 ? "rendered" : "MISSING");
await browser.close();
