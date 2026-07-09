import { chromium } from "playwright";
const BASE = "http://localhost:3457";
const OUT = "agent-outputs/assets-20260601-learn-courses-ux-audit";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const go = async (u) => { await page.goto(`${BASE}${u}`, { waitUntil: "domcontentloaded", timeout: 60000 }); await page.waitForTimeout(1500); };

// Home catalog
await go("/");
await page.screenshot({ path: `${OUT}/05-home-catalog.png`, fullPage: true });

// 404 page a learner hits from a broken /learn/python link
await go("/learn/python");
await page.screenshot({ path: `${OUT}/06-broken-link-404.png` });
console.log("404 page body:", (await page.locator("body").textContent()).replace(/\s+/g, " ").slice(0, 200));

// Dark mode lesson
await go("/learn/python-basics/hello-world");
await page.evaluate(() => { document.documentElement.classList.add("dark"); document.documentElement.style.colorScheme = "dark"; localStorage.setItem("theme","dark"); });
await go("/learn/python-basics/hello-world");
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/07-dark-lesson.png` });

// Reset to light
await page.evaluate(() => { localStorage.setItem("theme","light"); });

// Mobile viewport, lesson + nav
const m = await ctx.newPage();
await m.setViewportSize({ width: 390, height: 844 });
await m.goto(`${BASE}/learn/python-basics/hello-world`, { waitUntil: "domcontentloaded" });
await m.waitForTimeout(1500);
await m.screenshot({ path: `${OUT}/60-mobile-lesson.png`, fullPage: false });
// open mobile nav if a menu button exists
const menuBtn = m.locator('button[aria-label*="menu" i], button[aria-label*="navigation" i], [data-sidebar] button').first();
if (await menuBtn.count()) { await menuBtn.click().catch(() => {}); await m.waitForTimeout(600); await m.screenshot({ path: `${OUT}/61-mobile-nav.png` }); }
// mobile challenge card editor
await m.goto(`${BASE}/learn/challenge-cards-python`, { waitUntil: "domcontentloaded" });
await m.waitForTimeout(1500);
const cc = m.locator('[data-testid="challenge-card"]').first();
if (await cc.count()) { await cc.scrollIntoViewIfNeeded().catch(()=>{}); await cc.screenshot({ path: `${OUT}/62-mobile-challenge.png` }).catch(()=>{}); }
// mobile code block actions (do buttons overflow?)
await m.goto(`${BASE}/learn/sql-code-blocks-sqlite`, { waitUntil: "domcontentloaded" });
await m.waitForTimeout(1500);
await m.screenshot({ path: `${OUT}/63-mobile-sql.png` });

await browser.close();
console.log("captures done");
