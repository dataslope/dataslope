import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3457";
const OUT = "agent-outputs/assets-20260601-learn-courses-ux-audit";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const consoleErrors = [];
const pageErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
});
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 300)));

// 1) Landing
await page.goto(`${BASE}/learn`, { waitUntil: "networkidle", timeout: 60000 });
console.log("== /learn loaded ==");
console.log("title:", await page.title());
await page.screenshot({ path: `${OUT}/00-learn-index.png`, fullPage: false });

// 2) A python lesson with a code block, try to RUN a JS block first (native, no CDN)
await page.goto(`${BASE}/learn/javascript`, { waitUntil: "networkidle", timeout: 60000 });
const runBtns = page.locator(".run-btn, button:has-text('Run')");
console.log("JS page run buttons:", await runBtns.count());

// 3) Try running the first code block (JS is native; tests if execution works at all)
try {
  const firstRun = page.locator(".run-btn").first();
  await firstRun.waitFor({ state: "visible", timeout: 15000 });
  await firstRun.click();
  await page.waitForTimeout(4000);
  const outCells = await page.locator(".out-cell").count();
  console.log("JS run -> out-cells:", outCells);
  const outText = await page.locator(".out-cell").first().textContent().catch(() => "");
  console.log("JS first out-cell text:", (outText ?? "").slice(0, 120));
} catch (e) {
  console.log("JS run failed:", String(e).slice(0, 160));
}

// 4) Test a Python block (Pyodide from CDN) to see if network allows it
await page.goto(`${BASE}/learn/python-basics/hello-world`, { waitUntil: "networkidle", timeout: 60000 });
console.log("== python hello-world loaded ==");
try {
  const firstRun = page.locator(".run-btn").first();
  await firstRun.waitFor({ state: "visible", timeout: 15000 });
  await firstRun.click();
  // Pyodide can take 20-40s to boot from CDN
  await page.waitForTimeout(45000);
  const outCells = await page.locator(".out-cell").count();
  const outText = await page.locator(".out-cell").first().textContent().catch(() => "");
  console.log("Python run -> out-cells:", outCells, "| text:", (outText ?? "").slice(0, 120));
  const statusText = await page.locator(".pg-status, .loading-banner").first().textContent().catch(() => "");
  console.log("Python status banner:", (statusText ?? "").slice(0, 160));
} catch (e) {
  console.log("Python run failed:", String(e).slice(0, 200));
}

console.log("\n== CONSOLE ERRORS ==");
console.log(consoleErrors.slice(0, 20).join("\n"));
console.log("\n== PAGE ERRORS ==");
console.log(pageErrors.slice(0, 20).join("\n"));

await browser.close();
