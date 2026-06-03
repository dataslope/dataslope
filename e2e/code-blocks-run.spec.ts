import { test, expect, type Page, type Locator } from "@playwright/test";

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

const CODE_BLOCK_PAGES: { slug: string; label: string }[] = [
  { slug: "javascript", label: "JavaScript" },
  { slug: "typescript", label: "TypeScript" },
  { slug: "python", label: "Python" },
  { slug: "r", label: "R" },
  { slug: "php", label: "PHP" },
  { slug: "c", label: "C" },
  { slug: "cpp", label: "C++" },
  { slug: "java", label: "Java" },
  { slug: "csharp", label: "C#" },
];

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
  for (const { slug, label } of CODE_BLOCK_PAGES) {
    test(`${label} — every code block runs without error`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto(`/learn/code-blocks-${slug}`);
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
          `${failures.length}/${count} code blocks errored on ${slug}:\n` +
            failures.map((f) => `  ❌ ${f}`).join("\n"),
        );
      }
      expect(pageErrors, "no uncaught page errors during run").toEqual([]);
    });
  }
});
