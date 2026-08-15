import { test, expect, type Page } from "@playwright/test";

// Post-commit undo, all three engines: after a committed cell edit an undo
// bar offers to revert; "Undo" re-applies the previous value (PK-addressed).
// Lives in the shared ResultView; the reverse write goes through each
// engine's update path.

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

const SENTINEL = "ZZ_UNDO_SENTINEL";

const ENGINES: { id: string; route: string; table: string }[] = [
  { id: "SQLite", route: "/playground/sqlite", table: "users" },
  { id: "PostgreSQL", route: "/playground/postgres", table: "users" },
  { id: "DuckDB", route: "/playground/duckdb", table: "customers" },
];

for (const { id, route, table } of ENGINES) {
  test(`${id}: post-commit undo reverts the edit`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(route);
    await page
      .locator(".sql-tree-item")
      .filter({
        has: page.locator(".sql-tree-item-name", {
          hasText: new RegExp(`^${table}$`),
        }),
      })
      .first()
      .waitFor({ state: "visible", timeout: 150_000 });

    // Open the whole table (no LIMIT) so the edit's re-fetch goes through the
    // lazy path, which re-orders by primary key, the edited row keeps its
    // place instead of being pushed out of a LIMIT window by Postgres MVCC.
    await runSql(page, `SELECT * FROM ${table};`);
    const nameCell = page
      .locator(".sql-result-table tbody tr")
      .first()
      .locator("td:nth-child(3)");
    await expect(nameCell).toBeVisible({ timeout: 40_000 });
    await nameCell.dblclick();
    const input = page.locator(".sql-cell-input").first();
    await expect(input).toBeVisible();
    await input.fill(SENTINEL);
    await input.press("Enter");

    // Commit with the keyboard (focus is on the grid, not the SQL editor).
    const commit = page.locator(".sql-edit-commit-btn");
    await expect(commit).toBeVisible();
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(
      page.locator(".toast-title", { hasText: "Updated 1 cell" }),
    ).toBeVisible({ timeout: 40_000 });

    // The committed value is now in the grid, and the undo bar is offered.
    await expect(
      page.locator(".sql-result-table").getByText(SENTINEL),
    ).toBeVisible();
    const undoBar = page.locator(".sql-edit-undo-bar");
    await expect(undoBar).toBeVisible();
    await expect(undoBar).toContainText("Updated 1 cell");

    // Undo → the sentinel is gone (previous value restored) and the bar clears.
    await undoBar.locator(".sql-edit-undo-btn").click();
    await expect(
      page.locator(".sql-result-table").getByText(SENTINEL),
    ).toHaveCount(0, { timeout: 40_000 });
    await expect(undoBar).toBeHidden();
  });
}
