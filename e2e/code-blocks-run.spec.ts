import { test, expect, type Locator } from "@playwright/test";
import { discoverPages } from "./_discoverPages";

// Runs every <CodeBlock> on each /learn/code-blocks-<lang> demo page and
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
// COURSEWARE=1 to instead sweep every /learn page that embeds a <CodeBlock>
// across all courses — a long run intended for an opt-in CI job.
const DEMO_PAGES: { path: string; label: string }[] = [
  { path: "code-blocks-javascript", label: "JavaScript" },
  { path: "code-blocks-typescript", label: "TypeScript" },
  { path: "code-blocks-python", label: "Python" },
  { path: "code-blocks-r", label: "R" },
  { path: "code-blocks-php", label: "PHP" },
  { path: "code-blocks-c", label: "C" },
  { path: "code-blocks-cpp", label: "C++" },
  { path: "code-blocks-java", label: "Java" },
  { path: "code-blocks-csharp", label: "C#" },
];

const CODE_BLOCK_PAGES: { path: string; label: string }[] = process.env
  .COURSEWARE
  ? discoverPages(["<CodeBlock"]).map((p) => ({
      path: p.route.replace(/^\/learn\//, ""),
      label: p.route,
    }))
  : DEMO_PAGES;

async function runBlock(
  block: Locator,
  index: number,
): Promise<{ ok: boolean; detail: string }> {
  const runBtn = block.getByTestId("codeblock-run");
  await block.scrollIntoViewIfNeeded();
  // The first block triggers runtime init; the button is disabled
  // (isBusy) until the runtime is ready, then again while running.
  await expect(runBtn).toBeEnabled({ timeout: 150_000 });
  await runBtn.click();
  // Observe the run start (best-effort — interpreted runtimes are fast).
  await expect(runBtn).toBeDisabled({ timeout: 5_000 }).catch(() => {});
  await expect(runBtn).toBeEnabled({ timeout: 150_000 });

  const status = await block.locator("[data-status]").first().getAttribute("data-status");
  const stderrCells = block.locator('[data-cell-type="stderr"]');
  const stderrCount = await stderrCells.count();
  if (stderrCount === 0 && status !== "error") {
    return { ok: true, detail: "" };
  }
  const texts = await stderrCells.allTextContents();
  return {
    ok: false,
    detail: `block #${index} status=${status} stderr=${texts
      .join(" | ")
      .replace(/\s+/g, " ")
      .slice(0, 300)}`,
  };
}

test.describe("Code blocks run cleanly", () => {
  for (const { path: pagePath, label } of CODE_BLOCK_PAGES) {
    test(`${label} — every code block runs without error`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto(`/learn/${pagePath}`);
      const blocks = page.getByTestId("code-block");
      await expect(blocks.first()).toBeVisible({ timeout: 60_000 });
      const count = await blocks.count();
      expect(count, "page should contain at least one code block").toBeGreaterThan(0);

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
