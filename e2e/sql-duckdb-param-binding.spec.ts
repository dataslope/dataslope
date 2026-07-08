import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// DuckDB inline edits via prepared-statement parameter binding (UX-17).
//
// DuckDB's row-mutation methods used to build SQL by string-concatenating
// quote-escaped literals; they now bind values as positional `?` parameters.
// This spec drives a real edit through that path on DuckDB and asserts a
// commit round-trips a value containing single quotes, double quotes and an
// ampersand, i.e. that prepared-statement binding works in duckdb-wasm and
// needs no manual escaping. (The shared edit/commit UI is covered for all
// three engines by sql-edit-ergonomics / sql-edit-undo.)
// ─────────────────────────────────────────────────────────────────────

async function runSql(page: Page, sql: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(sql);
  await page
    .locator("button.run-btn-split-main, button.run-btn")
    .first()
    .click();
}

test("DuckDB: committed edit with quotes round-trips via param binding", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/playground/duckdb");
  await page
    .locator(".sql-tree-item")
    .filter({
      has: page.locator(".sql-tree-item-name", { hasText: /^customers$/ }),
    })
    .first()
    .waitFor({ state: "visible", timeout: 150_000 });

  // Whole table (no LIMIT) → the edit's re-fetch orders by primary key, so the
  // edited row keeps its place and the new value stays on screen.
  await runSql(page, "SELECT * FROM customers;");
  const nameCell = page
    .locator(".sql-result-table tbody tr")
    .first()
    .locator("td:nth-child(3)"); // row-select, customer_id, name
  await expect(nameCell).toBeVisible({ timeout: 40_000 });

  // A value that the old escape-by-string-concat path had to special-case.
  const TRICKY = `O'Brien & "Sons"`;
  await nameCell.dblclick();
  const input = page.locator(".sql-cell-input").first();
  await expect(input).toBeVisible();
  await input.fill(TRICKY);
  await input.press("Enter");

  await page.locator(".sql-edit-commit-btn").click();
  await expect(
    page.locator(".toast-title", { hasText: "Updated 1 cell" }),
  ).toBeVisible({ timeout: 40_000 });

  // The exact string (quotes and all) is back in the grid. The post-commit
  // re-fetch is a real `SELECT * FROM customers ORDER BY customer_id` against
  // DuckDB, so seeing the value proves the prepared-statement UPDATE bound and
  // persisted it without corruption, no manual escaping required.
  await expect(
    page.locator(".sql-result-table").getByText(TRICKY, { exact: true }),
  ).toBeVisible({ timeout: 40_000 });
});
