import { test, expect, type Locator } from "@playwright/test";
import { discoverPages } from "./_discoverPages";

// Runs every <SqlCodeBlock> on each demo page and asserts the query executes
// without the block entering "error" status. All engines run client-side.

// Default: the per-dialect demo pages. COURSEWARE=1 sweeps every docs page
// that embeds a <SqlCodeBlock> across all courses (long, opt-in CI run).
const DEMO_PAGES: { path: string; label: string }[] = [
  { path: "/fumadocs-dev/sql-code-blocks-sqlite", label: "SQLite" },
  { path: "/fumadocs-dev/sql-code-blocks-duckdb", label: "DuckDB" },
  { path: "/fumadocs-dev/sql-code-blocks-postgres", label: "PostgreSQL" },
];

const SQL_PAGES: { path: string; label: string }[] = process.env.COURSEWARE
  ? discoverPages(["<SqlCodeBlock"]).map((p) => ({
      path: p.route,
      label: p.route,
    }))
  : DEMO_PAGES;

async function runBlock(
  block: Locator,
  index: number,
): Promise<{ ok: boolean; detail: string }> {
  const runBtn = block.getByTestId("sql-codeblock-run");
  await block.scrollIntoViewIfNeeded();
  await expect(runBtn).toBeEnabled({ timeout: 120_000 });
  await runBtn.click();
  await expect(runBtn).toBeDisabled({ timeout: 5_000 }).catch(() => {});
  await expect(runBtn).toBeEnabled({ timeout: 120_000 });
  // Wait for the block to settle out of the transient running/loading state.
  await expect
    .poll(async () => block.getAttribute("data-run-status"), {
      timeout: 120_000,
    })
    .not.toMatch(/running|loading/);
  const status = await block.getAttribute("data-run-status");
  if (status !== "error") return { ok: true, detail: "" };
  return { ok: false, detail: `block #${index} status=error` };
}

test.describe("SQL code blocks run cleanly", () => {
  for (const { path: pagePath, label } of SQL_PAGES) {
    test(`${label}, every SQL code block runs without error`, async ({
      page,
    }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto(pagePath);
      const blocks = page.getByTestId("sql-code-block");
      await expect(blocks.first()).toBeVisible({ timeout: 60_000 });
      const count = await blocks.count();
      expect(count, "page should contain at least one SQL code block").toBeGreaterThan(0);

      const failures: string[] = [];
      for (let i = 0; i < count; i++) {
        const r = await runBlock(blocks.nth(i), i);
        if (!r.ok) failures.push(r.detail);
      }

      if (failures.length > 0) {
        throw new Error(
          `${failures.length}/${count} SQL code blocks errored on ${pagePath}:\n` +
            failures.map((f) => `  ❌ ${f}`).join("\n"),
        );
      }
      expect(pageErrors, "no uncaught page errors during run").toEqual([]);
    });
  }
});
