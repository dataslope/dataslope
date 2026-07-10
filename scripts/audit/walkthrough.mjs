import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3457";
const OUT = "agent-outputs/assets-20260601-learn-courses-ux-audit";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  ignoreHTTPSErrors: true,
});
const page = await ctx.newPage();

// ── Per-page diagnostics ────────────────────────────────────────────
const report = { pages: [], interactions: [] };
let curConsole = [];
let curFailed = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") {
    const t = m.text();
    // de-noise: cert errors from CDN are an artifact of the sandbox
    if (t.includes("ERR_CERT_AUTHORITY_INVALID")) return;
    curConsole.push(`[${m.type()}] ${t.slice(0, 200)}`);
  }
});
page.on("pageerror", (e) => curConsole.push(`[pageerror] ${String(e).slice(0, 200)}`));
page.on("requestfailed", (r) => {
  const u = r.url();
  if (u.includes("jsdelivr") || u.includes("cdn") || u.startsWith("https://")) return; // CDN noise
  curFailed.push(`${r.failure()?.errorText} ${u.slice(0, 120)}`);
});
page.on("response", (r) => {
  if (r.status() === 404 && r.url().startsWith(BASE)) curFailed.push(`404 ${r.url().replace(BASE, "")}`);
});

async function visit(slug, label) {
  curConsole = [];
  curFailed = [];
  const url = `${BASE}${slug}`;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const counts = await page.evaluate(() => ({
    codeBlocks: document.querySelectorAll('[aria-label$="executable code block"]').length,
    challenges: document.querySelectorAll('[data-testid="challenge-card"]').length,
    mcqs: document.querySelectorAll('[aria-label="Multiple choice question"]').length,
    mermaidSvg: document.querySelectorAll('[class*="mermaid"] svg, [class*="wrap"] > div svg').length,
    mermaidErr: [...document.querySelectorAll("*")].some((e) => /Syntax error in text|mermaid version/i.test(e.textContent || "") && e.children.length === 0),
    h2: document.querySelectorAll("article h2, .prose h2, h2").length,
    sqlBlocks: document.querySelectorAll('[class*="sqlBlock"], [data-testid*="sql"]').length,
  }));
  const rec = { slug, label, ms: Date.now() - t0, counts, console: [...curConsole], failed: [...curFailed] };
  report.pages.push(rec);
  console.log(`\n● ${label}  (${slug})  ${rec.ms}ms`);
  console.log(`   blocks=${counts.codeBlocks} challenges=${counts.challenges} mcq=${counts.mcqs} mermaid=${counts.mermaidSvg} h2=${counts.h2}`);
  if (counts.mermaidErr) console.log("   ⚠ POSSIBLE MERMAID RENDER ERROR");
  if (curConsole.length) console.log("   console:", curConsole.slice(0, 4).join(" | "));
  if (curFailed.length) console.log("   failed:", curFailed.slice(0, 4).join(" | "));
  return rec;
}

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` }).catch(() => {});

// ════════════════════════════════════════════════════════════════════
// STAGE 1, Structure + console sweep across a representative sample
// ════════════════════════════════════════════════════════════════════
const SAMPLE = [
  ["/learn", "Learn index"],
  ["/learn/multiple-choice", "MCQ showcase"],
  ["/learn/mermaid-test", "Mermaid showcase"],
  ["/learn/code-blocks-python", "CodeBlock showcase (py)"],
  ["/learn/challenge-cards-python", "Challenge showcase (py)"],
  ["/learn/sql-code-blocks-sqlite", "SQL CodeBlock showcase"],
  ["/learn/sql-challenge-cards-sqlite", "SQL Challenge showcase"],
  ["/learn/python-basics", "python-basics index"],
  ["/learn/python-basics/hello-world", "py hello-world"],
  ["/learn/python-basics/loops", "py loops (dup choice)"],
  ["/learn/intro-sql-postgres/what-is-a-database", "postgres ch1"],
  ["/learn/sqlite-for-beginners/what-is-a-database", "sqlite ch1"],
  ["/learn/beginners-javascript/story-of-programming", "js ch1"],
  ["/learn/typescript-from-scratch/evolution-of-javascript", "ts ch1"],
  ["/learn/from-zero-to-cpp/a-brief-history", "cpp ch1"],
  ["/learn/from-zero-to-cpp/compilation-pipeline", "cpp compilation (mermaid)"],
  ["/learn/intro-data-viz-plotly/history-of-visual-communication", "plotly ch1"],
  ["/learn/mastering-ggplot2/the-birth-of-ggplot2", "ggplot ch3"],
  ["/learn/java-programming-for-beginners/your-first-java-program", "java first prog (broken MCQ)"],
  ["/learn/machine-learning-scikit-learn/what-is-machine-learning", "ml ch1"],
  ["/learn/database-design-postgresql/why-structured-data", "dbdesign ch1"],
  ["/learn/practical-r-for-beginners/the-age-of-data", "r ch1"],
  ["/learn/natural-language-processing-python/what-is-nlp", "nlp ch1"],
  ["/learn/time-series-analysis-python", "time-series index"],
];

for (const [slug, label] of SAMPLE) {
  await visit(slug, label).catch((e) => console.log("visit fail", slug, String(e).slice(0, 120)));
}

// landing + one content page full screenshots
await visit("/learn", "Learn index");
await shot("01-learn-index");
await page.goto(`${BASE}/learn/python-basics/hello-world`, { waitUntil: "networkidle" }).catch(() => {});
await page.waitForTimeout(800);
await shot("02-lesson-top");

writeFileSync(`${OUT}/walkthrough-report.json`, JSON.stringify(report, null, 2));
console.log("\n=== STAGE 1 done. Pages visited:", report.pages.length, "===");
await browser.close();
