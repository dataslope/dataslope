import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3457";
const OUT = "agent-outputs/assets-20260601-learn-courses-ux-audit";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const log = [];
const note = (s) => { console.log(s); log.push(s); };

const fullErrors = new Set();
page.on("console", (m) => {
  if (m.type() === "error") {
    const t = m.text();
    if (!t.includes("ERR_CERT_AUTHORITY_INVALID")) fullErrors.add(t.slice(0, 500));
  }
});

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` }).catch(() => {});
const shotEl = async (loc, n) => { try { await loc.scrollIntoViewIfNeeded(); await loc.screenshot({ path: `${OUT}/${n}.png` }); } catch (e) { note(`  shot fail ${n}: ${String(e).slice(0,60)}`); } };

// ════ MCQ DEEP-DIVE (no runtime) ════
note("\n════ MCQ interactions (/learn/multiple-choice) ════");
await page.goto(`${BASE}/learn/multiple-choice`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1000);
const mcqs = page.locator('[aria-label="Multiple choice question"]');
const nMcq = await mcqs.count();
note(`MCQs found: ${nMcq}`);

// Q1: single-answer — does clicking a choice auto-submit?
const q1 = mcqs.nth(0);
await shotEl(q1, "10-mcq-initial");
const q1mode = await q1.locator('[class*="modeLabel"]').textContent().catch(() => "");
note(`Q1 mode label: "${(q1mode||"").trim()}"`);
const q1inputs = q1.locator('input');
note(`Q1 inputs: ${await q1inputs.count()}, type=${await q1inputs.first().getAttribute("type")}`);
// Click first choice and see if a banner appears WITHOUT a submit click
await q1.locator('[class*="choice"]').first().click();
await page.waitForTimeout(600);
const q1bannerAfterClick = await q1.locator('[class*="banner"]').count();
note(`Q1 banner appeared after a single click (no Submit btn)? ${q1bannerAfterClick > 0 ? "YES — auto-submits" : "no"}`);
await shotEl(q1, "11-mcq-single-after-click");
// can we change the answer now?
const q1disabled = await q1inputs.first().isDisabled().catch(() => null);
note(`Q1 inputs disabled after submit (locked)? ${q1disabled}`);
const retry = q1.locator('button:has-text("Try again")');
note(`Q1 has 'Try again'? ${await retry.count() > 0}`);

// Find a multi-answer question and exercise partial/full
for (let i = 0; i < nMcq; i++) {
  const q = mcqs.nth(i);
  const mode = (await q.locator('[class*="modeLabel"]').textContent().catch(() => "")) || "";
  if (/Select all/i.test(mode)) {
    note(`\nMulti-answer MCQ at index ${i}: "${mode.trim()}"`);
    const submit = q.locator('button:has-text("Submit")');
    note(`  Submit disabled with nothing selected? ${await submit.isDisabled().catch(() => "n/a")}`);
    // pick only ONE correct-ish choice to trigger "partial"
    await q.locator('[class*="choice"]').first().click();
    await page.waitForTimeout(200);
    await submit.click().catch(() => {});
    await page.waitForTimeout(500);
    const banner = await q.locator('[class*="banner"]').textContent().catch(() => "");
    note(`  After submitting 1 choice → banner: "${(banner||"").trim().slice(0,80)}"`);
    await shotEl(q, "12-mcq-multi-result");
    break;
  }
}

// ════ MERMAID ════
note("\n════ Mermaid (/learn/mermaid-test) ════");
await page.goto(`${BASE}/learn/mermaid-test`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);
const mermaidWraps = page.locator('[class*="wrap"]:has(svg)');
note(`Mermaid diagrams rendered: ${await mermaidWraps.count()}`);
await shotEl(mermaidWraps.first(), "20-mermaid-inline");
// hover to reveal expand btn, then open fullscreen
const expandBtn = page.locator('[aria-label="Expand diagram to full page"]').first();
if (await expandBtn.count()) {
  await mermaidWraps.first().hover().catch(() => {});
  await expandBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1200);
  const modal = page.locator('[aria-label="Mermaid diagram (full page)"]');
  note(`Fullscreen modal opened? ${await modal.count() > 0}`);
  await shot("21-mermaid-fullscreen");
  // zoom controls present?
  note(`Zoom controls: in=${await page.locator('[aria-label="Zoom in"]').count()} out=${await page.locator('[aria-label="Zoom out"]').count()} reset=${await page.locator('[aria-label="Reset zoom and recenter"]').count()}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}

// ════ JS code block (native, fast) ════
note("\n════ JS CodeBlock run (/learn/code-blocks-javascript) ════");
await page.goto(`${BASE}/learn/code-blocks-javascript`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1000);
const jsCb = page.locator('[aria-label$="executable code block"]').first();
await shotEl(jsCb, "30-js-codeblock-before");
const jsRun = jsCb.locator('[aria-label="Code block actions"] button').first();
const t0 = Date.now();
await jsRun.click();
await page.waitForFunction((el) => el.querySelectorAll('[class*="outCell"]').length > 0, await jsCb.elementHandle(), { timeout: 30000 }).catch(() => note("  JS: no output cell appeared in 30s"));
note(`  JS run produced output in ${Date.now() - t0}ms`);
const jsOut = await jsCb.locator('[class*="outCellBody"]').first().textContent().catch(() => "");
note(`  JS output: "${(jsOut||"").trim().slice(0,80)}"`);
await shotEl(jsCb, "31-js-codeblock-after");

// ════ Python CodeBlock + Challenge (Pyodide boot) ════
note("\n════ Python run + challenge (/learn/python-basics/hello-world) ════");
await page.goto(`${BASE}/learn/python-basics/hello-world`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1000);
const pyCb = page.locator('[aria-label$="executable code block"]').first();
const pyRun = pyCb.locator('[aria-label="Code block actions"] button').first();
const tp = Date.now();
await pyRun.click();
note("  Booting Pyodide (CDN)…");
await page.waitForFunction((el) => el.querySelectorAll('[class*="outCell"]').length > 0, await pyCb.elementHandle(), { timeout: 90000 }).catch(() => note("  ⚠ Python: no output in 90s (CDN blocked?)"));
const pyMs = Date.now() - tp;
const pyOut = await pyCb.locator('[class*="outCellBody"]').first().textContent().catch(() => "");
note(`  Python first-run (incl Pyodide boot): ${pyMs}ms → "${(pyOut||"").trim().slice(0,60)}"`);
await shotEl(pyCb, "40-python-codeblock-after");

// Challenge: drive via window.__dsChallenges
note("\n  -- Challenge: load reference solution & submit --");
const solveResult = await page.evaluate(async () => {
  const reg = window.__dsChallenges || {};
  const keys = Object.keys(reg);
  if (!keys.length) return { ok: false, msg: "no __dsChallenges registry" };
  const handle = reg[keys[0]];
  // load solution files from the card's data attribute
  const card = document.querySelector('[data-testid="challenge-card"]');
  const payload = card?.getAttribute("data-solution-files");
  if (payload) {
    for (const f of JSON.parse(payload)) handle.setFileContent(f.filename, f.source);
  }
  await handle.submit();
  // wait for results
  await new Promise((r) => setTimeout(r, 1500));
  return { ok: true, key: keys[0], banner: handle.getBannerState(), status: handle.getStatus(), tests: handle.getTestResults() };
});
note(`  solve via registry: ${JSON.stringify(solveResult).slice(0, 300)}`);
await page.waitForTimeout(1000);
await shotEl(page.locator('[data-testid="challenge-card"]').first(), "41-python-challenge-pass");

// Submit WRONG code to see the fail UX
note("\n  -- Challenge: submit wrong code → fail state --");
const failResult = await page.evaluate(async () => {
  const reg = window.__dsChallenges || {};
  const handle = reg[Object.keys(reg)[0]];
  handle.setFileContent(handle.entryFilename, "name = 'Grace'\nprint('wrong output')\n");
  await handle.submit();
  await new Promise((r) => setTimeout(r, 1500));
  return { banner: handle.getBannerState(), tests: handle.getTestResults() };
});
note(`  wrong submit → ${JSON.stringify(failResult).slice(0, 250)}`);
await shotEl(page.locator('[data-testid="challenge-card"]').first(), "42-python-challenge-fail");

// Open "Show Solution" modal
const solBtn = page.locator('button:has-text("Solution"), button:has-text("Show Solution")').first();
if (await solBtn.count()) {
  await solBtn.click().catch(() => {});
  await page.waitForTimeout(800);
  await shot("43-python-solution-modal");
  note("  Solution modal screenshot captured");
  await page.keyboard.press("Escape").catch(() => {});
}

// ════ SQL CodeBlock (SQLite wasm) ════
note("\n════ SQL run (/learn/sql-code-blocks-sqlite) ════");
await page.goto(`${BASE}/learn/sql-code-blocks-sqlite`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1500);
const sqlBtns = page.locator('button:has-text("Run")');
note(`  Run buttons on SQL page: ${await sqlBtns.count()}`);
await shot("50-sql-page");
if (await sqlBtns.count()) {
  const ts = Date.now();
  await sqlBtns.first().click().catch(() => {});
  await page.waitForTimeout(8000);
  note(`  SQL first-run waited ${Date.now() - ts}ms`);
  await shot("51-sql-after-run");
  // look for a result grid / table
  const grids = await page.locator('table, [class*="grid"], [role="grid"]').count();
  note(`  result tables/grids on page: ${grids}`);
}

note("\n════ FULL CONSOLE ERRORS (deduped) ════");
[...fullErrors].forEach((e) => note("• " + e.replace(/\s+/g, " ")));

writeFileSync(`${OUT}/interact-log.txt`, log.join("\n"));
await browser.close();
note("\n=== interaction stage done ===");
