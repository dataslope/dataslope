import { test, expect, type Locator } from "@playwright/test";
import { adapterSelector, pagesForAdapters, requestedAdapters } from "./_adapterFilter";

// Runs every <CodeBlock> on each demo page and asserts it executes without a
// real error. Blocks of one language share a single runtime per page (see
// runtimeRegistry.ts), so WASM init happens once.

// Default: the per-language demo pages. COURSEWARE=1 sweeps every docs page
// embedding a <CodeBlock>; ADAPTERS=java,csharp,… narrows both the page list
// and the blocks run (see _adapterFilter.ts).
const DEMO_PAGES: { path: string; label: string }[] = [
  { path: "/fumadocs-dev/code-blocks-javascript", label: "JavaScript" },
  { path: "/fumadocs-dev/code-blocks-typescript", label: "TypeScript" },
  { path: "/fumadocs-dev/code-blocks-python", label: "Python" },
  { path: "/fumadocs-dev/code-blocks-r", label: "R" },
  { path: "/fumadocs-dev/code-blocks-php", label: "PHP" },
  { path: "/fumadocs-dev/code-blocks-c", label: "C" },
  { path: "/fumadocs-dev/code-blocks-cpp", label: "C++" },
  { path: "/fumadocs-dev/code-blocks-java", label: "Java" },
  { path: "/fumadocs-dev/code-blocks-csharp", label: "C#" },
  { path: "/fumadocs-dev/code-blocks-web", label: "Web (HTML/CSS/JS)" },
  { path: "/fumadocs-dev/code-blocks-react", label: "React" },
];

const ADAPTERS = requestedAdapters();

const CODE_BLOCK_PAGES: { path: string; label: string }[] = process.env
  .COURSEWARE
  ? pagesForAdapters(["<CodeBlock"], ADAPTERS).map((p) => ({
      path: p.route,
      label: p.route,
    }))
  : DEMO_PAGES;

const BLOCK_SELECTOR = adapterSelector("code-block", "data-adapter", ADAPTERS);

// web/react render into a sandboxed iframe whose console bridge stays attached
// after the run resolves (see webPreview.ts), so a deferred throw can arrive
// after Run re-enables and with status=ready. The settle window catches errors
// a status-only or immediate stderr read misses; other adapters have complete
// output when their run resolves.
const PREVIEW_ADAPTERS = new Set(["web", "react"]);
const PREVIEW_SETTLE_MS = 1_500;

// The java adapter forwards javac's -Xlint warnings to stderr, and several
// blocks teach lint warnings on purpose — "any stderr fails" would flag them
// all. Only `error:` diagnostics, uncaught exceptions, or non-zero exit count.
const JAVA_REAL_FAILURE = /: error:|Exception in thread|Program exited with code/;

function isRealFailure(adapter: string, stderr: string): boolean {
  if (!stderr) return false;
  if (adapter === "java") return JAVA_REAL_FAILURE.test(stderr);
  return true;
}

/**
 * Click Run and confirm the block actually started. The server-rendered Run
 * button looks enabled before hydration, so an early click is silently
 * swallowed (status stays `idle`) and would read as a clean run. `idle` is a
 * safe pre-run sentinel: every terminal state is also "not idle".
 */
async function startRun(block: Locator, runBtn: Locator): Promise<boolean> {
  const status = () => block.locator("[data-status]").first().getAttribute("data-status");
  for (let attempt = 0; attempt < 3; attempt++) {
    await runBtn.click();
    const started = await expect
      .poll(status, { timeout: 10_000 })
      .not.toBe("idle")
      .then(() => true)
      .catch(() => false);
    if (started) return true;
  }
  return false;
}

async function runBlock(
  block: Locator,
  index: number,
): Promise<{ ok: boolean; detail: string }> {
  const runBtn = block.getByTestId("codeblock-run");
  await block.scrollIntoViewIfNeeded();
  // The first block triggers runtime init; the button is disabled
  // (isBusy) until the runtime is ready, then again while running.
  await expect(runBtn).toBeEnabled({ timeout: 150_000 });
  const adapter = (await block.getAttribute("data-adapter")) ?? "";
  const expectsError = (await block.getAttribute("data-expect-error")) === "true";

  if (!(await startRun(block, runBtn))) {
    return {
      ok: false,
      detail: `block #${index} [${adapter}] never left status=idle after three Run clicks`,
    };
  }
  // Settled means back out of loading/running, not merely re-enabled.
  await expect
    .poll(() => block.locator("[data-status]").first().getAttribute("data-status"), {
      timeout: 150_000,
    })
    .not.toMatch(/loading|running/);
  await expect(runBtn).toBeEnabled({ timeout: 150_000 });

  const stderrCells = block.locator('[data-cell-type="stderr"]');
  const stderrText = async () => (await stderrCells.allTextContents()).join("\n");
  const errored = async () =>
    isRealFailure(adapter, await stderrText()) ||
    (await block.locator("[data-status]").first().getAttribute("data-status")) === "error";

  // expectError asserts both directions: a block whose lesson is the failure
  // must fail, or the prose promises an error the reader never sees. Polling
  // lets a late preview-adapter error count.
  if (expectsError) {
    await expect
      .poll(errored, { timeout: PREVIEW_SETTLE_MS + 3_500 })
      .toBe(true)
      .catch(() => {});
    if (await errored()) return { ok: true, detail: "" };
    return {
      ok: false,
      detail: `block #${index} [${adapter}] is marked expectError but produced no error output`,
    };
  }

  if (PREVIEW_ADAPTERS.has(adapter)) await block.page().waitForTimeout(PREVIEW_SETTLE_MS);

  const status = await block.locator("[data-status]").first().getAttribute("data-status");
  const text = await stderrText();
  if (!isRealFailure(adapter, text) && status !== "error") {
    return { ok: true, detail: "" };
  }
  return {
    ok: false,
    detail: `block #${index} [${adapter}] status=${status} stderr=${text
      .replace(/\s+/g, " ")
      .slice(0, 300)}`,
  };
}

test.describe("Code blocks run cleanly", () => {
  for (const { path: pagePath, label } of CODE_BLOCK_PAGES) {
    test(`${label}, every code block runs without error`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto(pagePath);
      const blocks = page.locator(BLOCK_SELECTOR);
      // With an adapter filter a page may legitimately have no blocks (the
      // language may appear only on a <ChallengeCard>); counts are reconciled
      // by check-browser-blocks.mjs instead of asserted here.
      if (ADAPTERS === null) {
        await expect(blocks.first()).toBeVisible({ timeout: 60_000 });
      } else {
        await page
          .locator('[data-testid="code-block"]')
          .first()
          .waitFor({ timeout: 60_000 })
          .catch(() => {});
      }
      const count = await blocks.count();
      if (ADAPTERS === null) {
        expect(count, "page should contain at least one code block").toBeGreaterThan(0);
      }
      console.log(`SWEEP ${JSON.stringify({ route: pagePath, kind: "block", ran: count })}`);
      if (count === 0) return;

      const failures: string[] = [];
      for (let i = 0; i < count; i++) {
        const r = await runBlock(blocks.nth(i), i);
        if (!r.ok) failures.push(r.detail);
      }

      if (failures.length > 0) {
        throw new Error(
          `${failures.length}/${count} code blocks errored on ${pagePath}:\n` +
            failures.map((f) => `  ❌ ${f}`).join("\n"),
        );
      }
      expect(pageErrors, "no uncaught page errors during run").toEqual([]);
    });
  }
});
