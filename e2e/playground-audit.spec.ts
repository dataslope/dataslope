import { test, expect, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

// ─────────────────────────────────────────────────────────────────────
// Playground audit: for every non-SQL playground, exercise *all* of the
// built-in examples (Examples menu) and *all* of the package demos
// (Packages drawer → "Example" button), running each one and recording
// whether it produced an error cell. This is the harness behind the
// "do all examples run?" / "do all package imports work?" checks.
//
// One runtime init per playground, then each example/package snippet is
// loaded into the editor and run in turn (the heavy worker stays warm).
// Results are written to `audit-results/<lang>.json` and summarised on
// stdout so failures are easy to triage.
//
// Run a single playground:   npx playwright test playground-audit -g "python"
// ─────────────────────────────────────────────────────────────────────

const RUN_TIMEOUT = 150_000;
const RESULTS_DIR = path.join(process.cwd(), "audit-results");

interface RunResult {
  /** "example:<title>" or "package:<name>" */
  label: string;
  kind: "example" | "package";
  /** Output cell types produced, e.g. ["stdout"] or ["stderr"]. */
  cellTypes: string[];
  /** Text of any stderr/error cells (joined). Empty when clean. */
  stderr: string;
  /** Whether this run is considered a failure (see classifyError). */
  failed: boolean;
}

async function waitForRuntimeReady(page: Page) {
  await page.waitForFunction(
    () => {
      const banner = document.querySelector(".loading-banner, .pg-status");
      const text = banner?.textContent ?? "";
      if (text.startsWith("Failed to load")) {
        throw new Error(text);
      }
      const btn = document.querySelector(".run-btn");
      return !!btn && !btn.hasAttribute("disabled");
    },
    null,
    { timeout: RUN_TIMEOUT },
  );
}

/** If the "Discard current code?" dialog is up, accept it. Loading any
 *  example/package snippet while the editor is dirty pops this dialog. */
async function acceptDiscardIfPresent(page: Page) {
  const danger = page.locator(".confirm-popup .confirm-btn-danger");
  try {
    await danger.waitFor({ state: "visible", timeout: 2500 });
    await danger.click();
  } catch {
    // No dialog — the snippet auto-loaded (editor matched / was empty).
  }
}

async function clearOutput(page: Page) {
  const btn = page.locator('button[aria-label="Clear output"]');
  if ((await btn.count()) && (await btn.isEnabled())) {
    await btn.click();
  }
}

/** Click Run, wait for the run to start (button disables) and finish
 *  (button re-enables), then return this run's freshly-appended cells. */
async function runAndCollect(page: Page): Promise<{ type: string; body: string }[]> {
  const before = await page.locator(".out-cell").count();
  const runBtn = page.locator(".run-btn").first();
  await runBtn.click();
  // Best-effort: observe the run starting. Interpreted runtimes can be
  // near-instant, so don't hard-fail if we miss the disabled flicker.
  await expect(runBtn).toBeDisabled({ timeout: 4000 }).catch(() => {});
  await expect(runBtn).toBeEnabled({ timeout: RUN_TIMEOUT });
  // Let any final cell settle ("Done in …" timestamp).
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll(".out-cell")].every((c) =>
          (c.querySelector(".cell-time")?.textContent ?? "").includes("Done in"),
        ),
      null,
      { timeout: RUN_TIMEOUT },
    )
    .catch(() => {});

  const all = await page.locator(".out-cell").all();
  const fresh = all.slice(before);
  const cells: { type: string; body: string }[] = [];
  for (const cell of fresh) {
    const cls = (await cell.getAttribute("class")) ?? "";
    const type =
      cls
        .split(/\s+/)
        .find((c) =>
          ["stdout", "stderr", "html", "image", "plot"].includes(c),
        ) ?? "unknown";
    const body = (await cell.locator(".out-cell-body").textContent()) ?? "";
    cells.push({ type, body });
  }
  return cells;
}

/** Decide whether an stderr cell represents a genuine error vs. benign
 *  diagnostic output (e.g. a compiler warning). Tightened per language
 *  as real audit output reveals false positives. */
function classifyError(langId: string, stderr: string): boolean {
  const s = stderr.trim();
  if (!s) return false;
  // Java/C/C++ toolchains can emit warnings on stderr that don't stop a
  // successful run. Treat as failure only when there's an explicit error
  // marker or the program produced *no* other (stdout) output.
  return true; // start strict; refined below via allowlist
}

/** Load the i-th example from the Examples menu. */
async function loadExample(page: Page, index: number) {
  await page.locator('button[aria-label="Examples"]').click();
  const items = page.locator(".example-item");
  await items.first().waitFor({ state: "visible", timeout: 10_000 });
  await items.nth(index).click();
  await acceptDiscardIfPresent(page);
}

async function exampleTitles(page: Page): Promise<string[]> {
  await page.locator('button[aria-label="Examples"]').click();
  const items = page.locator(".example-item .ex-title");
  await items.first().waitFor({ state: "visible", timeout: 10_000 });
  const titles = await items.allTextContents();
  await page.keyboard.press("Escape");
  await page.locator(".example-item").first().waitFor({ state: "hidden" }).catch(() => {});
  return titles;
}

async function packageExampleNames(page: Page): Promise<string[]> {
  const pkgBtn = page.locator('button[aria-label="Packages"]');
  if ((await pkgBtn.count()) === 0) return [];
  await pkgBtn.first().click();
  const btns = page.locator(".pkg-example-btn");
  try {
    await btns.first().waitFor({ state: "visible", timeout: 5000 });
  } catch {
    await page.keyboard.press("Escape");
    return [];
  }
  const labels = await btns.evaluateAll((els) =>
    els.map(
      (el) =>
        el.getAttribute("aria-label")?.replace("Load example using ", "") ??
        "?",
    ),
  );
  await page.keyboard.press("Escape");
  await page.locator(".pkg-drawer").waitFor({ state: "hidden" }).catch(() => {});
  return labels;
}

/** Open the drawer and click the package-example button for `name`. */
async function loadPackageExample(page: Page, name: string) {
  await page.locator('button[aria-label="Packages"]').first().click();
  const btn = page.locator(
    `.pkg-example-btn[aria-label="Load example using ${name}"]`,
  );
  await btn.waitFor({ state: "visible", timeout: 5000 });
  await btn.click();
  await acceptDiscardIfPresent(page);
}

async function auditPlayground(page: Page, langId: string, route: string) {
  test.setTimeout(30 * 60_000);
  const results: RunResult[] = [];

  await page.goto(route);
  await waitForRuntimeReady(page);

  // ── Examples ──────────────────────────────────────────────────────
  const titles = await exampleTitles(page);
  for (let i = 0; i < titles.length; i++) {
    await loadExample(page, i);
    await clearOutput(page);
    const cells = await runAndCollect(page);
    const stderr = cells
      .filter((c) => c.type === "stderr")
      .map((c) => c.body)
      .join("\n")
      .trim();
    const failed = classifyError(langId, stderr);
    results.push({
      label: `example:${titles[i]}`,
      kind: "example",
      cellTypes: cells.map((c) => c.type),
      stderr,
      failed,
    });
  }

  // ── Package examples ──────────────────────────────────────────────
  const pkgNames = await packageExampleNames(page);
  for (const name of pkgNames) {
    await loadPackageExample(page, name);
    await clearOutput(page);
    const cells = await runAndCollect(page);
    const stderr = cells
      .filter((c) => c.type === "stderr")
      .map((c) => c.body)
      .join("\n")
      .trim();
    const failed = classifyError(langId, stderr);
    results.push({
      label: `package:${name}`,
      kind: "package",
      cellTypes: cells.map((c) => c.type),
      stderr,
      failed,
    });
  }

  // ── Report ────────────────────────────────────────────────────────
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(RESULTS_DIR, `${langId}.json`),
    JSON.stringify(results, null, 2),
  );

  const failures = results.filter((r) => r.failed);
  const lines = [
    `\n──── AUDIT ${langId} (${route}) ────`,
    `  examples: ${results.filter((r) => r.kind === "example").length}` +
      `  packages: ${results.filter((r) => r.kind === "package").length}` +
      `  failures: ${failures.length}`,
  ];
  for (const r of results) {
    const mark = r.failed ? "✗" : "✓";
    lines.push(
      `  ${mark} ${r.label}  [${r.cellTypes.join(",") || "no-output"}]`,
    );
    if (r.failed) {
      lines.push(
        `      ↳ ${r.stderr.replace(/\s+/g, " ").slice(0, 240)}`,
      );
    }
  }
  console.log(lines.join("\n"));

  // Soft so a single playground reports *all* failing snippets at once.
  for (const f of failures) {
    expect.soft(f.stderr, `${langId} ${f.label} errored`).toBe("");
  }
}

const PLAYGROUNDS: { id: string; route: string }[] = [
  { id: "python", route: "/playground/python" },
  { id: "r", route: "/playground/r" },
  { id: "javascript", route: "/playground/javascript" },
  { id: "typescript", route: "/playground/typescript" },
  { id: "php", route: "/playground/php" },
  { id: "c", route: "/playground/c" },
  { id: "cpp", route: "/playground/cpp" },
  { id: "csharp", route: "/playground/csharp" },
  { id: "java", route: "/playground/java" },
];

// This sweep boots every heavy runtime (Pyodide, WebR, browsercc,
// CheerpJ, .NET) and runs ~150 snippets, so it's far too slow for the
// default CI e2e run. It's opt-in: set AUDIT_PLAYGROUNDS=1 to enable.
//   AUDIT_PLAYGROUNDS=1 npx playwright test playground-audit -g "audit python"
const auditEnabled = !!process.env.AUDIT_PLAYGROUNDS;

for (const { id, route } of PLAYGROUNDS) {
  (auditEnabled ? test : test.skip)(`audit ${id}`, async ({ page }) => {
    await auditPlayground(page, id, route);
  });
}
