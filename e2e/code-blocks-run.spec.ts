import { test, expect, type Locator } from "@playwright/test";
import { adapterSelector, pagesForAdapters, requestedAdapters } from "./_adapterFilter";

// Runs every <CodeBlock> on each /fumadocs-dev/code-blocks-<lang> demo page and
// asserts the snippet executes without producing an ERROR (stderr) output
// cell. This is the "do all code blocks run?" check.
//
// Each <CodeBlock> exposes:
//   - root:   [data-testid="code-block"]
//   - status: a descendant [data-status] dot ("idle"|"loading"|"running"
//             |"ready"|"error")
//   - run:    [data-testid="codeblock-run"] (disabled while busy)
//   - output: [data-cell-type="stdout"|"stderr"|"html"|"image"|"plot"]
//
// All blocks of one language on a page share a single runtime (see
// runtimeRegistry.ts), so the heavy WASM init happens once per page.

// Default: the per-language demo pages (fast, representative). Set
// COURSEWARE=1 to instead sweep every docs page that embeds a <CodeBlock>
// across all courses, a long run intended for an opt-in CI job. `path` is
// the full route. `ADAPTERS=java,csharp,…` narrows both the page list and
// the blocks run on each page to those languages (see _adapterFilter.ts).
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

// The `web` and `react` adapters render into a sandboxed iframe and bridge its
// console back as cells (see webPreview.ts). The run resolves 150 ms after the
// iframe's `load`, but the bridge stays attached, so an error thrown later —
// from a timer, an effect, an event handler — arrives after the Run button is
// enabled again and after a naive read of stderr.
//
// Measured against three deliberately broken blocks: a throw during render and
// a 400 ms deferred throw are caught either way, a 2 s deferred throw is caught
// only with the window (and reports `status=ready`, so a status-only check
// misses all three). 1.5 s is therefore doing real work, and only these two
// adapters pay for it — the rest have complete output when their run resolves.
const PREVIEW_ADAPTERS = new Set(["web", "react"]);
const PREVIEW_SETTLE_MS = 1_500;

// javac is run with `-Xlint`, and the adapter forwards its whole diagnostic
// stream to a stderr cell "so warnings show up alongside errors" (java.tsx).
// A warning is not a failure: javac still exits 0, the class still runs, and
// the reader still gets the output the lesson promises. Nine blocks teach
// exactly that — raw `Vector`, a redundant cast, `equals` without `hashCode`,
// a serializable class with no `serialVersionUID` — and "any stderr fails"
// would have reported all nine as broken while they work perfectly.
//
// What does fail: a javac diagnostic marked `error:`, an uncaught exception,
// or a non-zero exit, each of which the adapter reports verbatim.
const JAVA_REAL_FAILURE = /: error:|Exception in thread|Program exited with code/;

function isRealFailure(adapter: string, stderr: string): boolean {
  if (!stderr) return false;
  if (adapter === "java") return JAVA_REAL_FAILURE.test(stderr);
  return true;
}

/**
 * Click Run and confirm the block actually started.
 *
 * The Run button is server-rendered and looks enabled long before React wires
 * its handler, so an early click is swallowed with no trace: the status dot
 * stays `idle`, no cell appears, and the button — never having been disabled —
 * is still enabled. The old sequence read that as a finished, clean run.
 * Measured on `collection-architecture`, whose single block sat at `idle` for
 * three unbroken minutes after its click while the sweep called it a pass; the
 * same block runs in ~25 s when the click lands after hydration.
 *
 * So the run has to prove it began. `idle` is a safe pre-run sentinel because
 * every block is run exactly once here, and every terminal state (`ready`,
 * `error`) is also "not idle", so a runtime fast enough to finish between
 * polls still satisfies it.
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

  // `expectError` asserts in both directions, as the four Node sweeps do. A
  // block whose lesson is the failure must fail; if it ever stops failing the
  // prose above it is left promising an error the reader no longer sees, and
  // nothing else in the repo would notice. Polling rather than reading once
  // lets a preview-adapter error arrive late without being scored as success.
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
      // With no adapter filter, a page reached through `<CodeBlock` must have
      // blocks. With one, it may legitimately have none: the page was selected
      // because the language appears *somewhere* in its MDX, which can be on a
      // `<ChallengeCard>` alone. Reported rather than asserted, and reconciled
      // against the extractor's totals by check-browser-blocks.mjs so a filter
      // that silently matches nothing cannot pass for coverage.
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
