import { chromium } from "playwright";
const BASE = "http://localhost:3457";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();

// Sidebar links on the /learn index
await page.goto(`${BASE}/learn`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const sidebarLinks = await page.evaluate(() => {
  const nav = document.querySelector('aside, nav[aria-label], [data-sidebar], #nd-sidebar') || document.body;
  return [...document.querySelectorAll('aside a, [class*="sidebar"] a, nav a')]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h.startsWith("/learn"));
});
const uniq = [...new Set(sidebarLinks)];
console.log("Sidebar /learn links (unique):", uniq.length);
console.log(uniq.join("\n"));
const courseSlugs = ["python-basics","beginners-javascript","intro-sql-postgres","mastering-ggplot2","from-zero-to-cpp"];
console.log("\nAny real-course links in sidebar?");
for (const c of courseSlugs) console.log(`  ${c}: ${uniq.some((h) => h.includes(c)) ? "YES" : "NO"}`);

// Screenshot full sidebar (tall viewport)
await page.screenshot({ path: "agent-outputs/assets-20260601-learn-courses-ux-audit/03-sidebar-full.png" });

// Now load a COURSE page and see what the sidebar shows
await page.goto(`${BASE}/learn/python-basics/hello-world`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const courseSidebar = await page.evaluate(() =>
  [...new Set([...document.querySelectorAll('aside a, nav a')].map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("/learn")))]
);
console.log("\nOn a course page, sidebar shows", courseSidebar.length, "links. Sample:");
console.log(courseSidebar.slice(0, 12).join("\n"));
console.log("\nDoes course-page sidebar link to OTHER courses (cross-course nav)?",
  courseSidebar.some((h) => h.includes("beginners-javascript") || h.includes("intro-sql")));
await page.screenshot({ path: "agent-outputs/assets-20260601-learn-courses-ux-audit/04-course-sidebar.png" });

await browser.close();
