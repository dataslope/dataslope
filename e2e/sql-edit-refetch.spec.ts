import { test, expect, type Page } from "@playwright/test";

// Regression (all three engines): editing a cell in a result with its own
// LIMIT used to re-fetch with a bare `SELECT * FROM <table>`, so the grid
// jumped from 3 rows to the whole table. The refetch must re-run the SAME
// query so the LIMIT (and shape) is preserved.

async function runSql(page: Page, sql: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(sql);
  await page.locator("button.run-btn-split-main, button.run-btn").first().click();
}

const ENGINES: { id: string; route: string; table: string }[] = [
  { id: "SQLite", route: "/playground/sqlite", table: "users" },
  { id: "PostgreSQL", route: "/playground/postgres", table: "users" },
  { id: "DuckDB", route: "/playground/duckdb", table: "customers" },
];

for (const { id, route, table } of ENGINES) {
  test(`${id}: editing a cell in a LIMIT query preserves the LIMIT on refetch`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto(route);
    // Engine boot + schema ready once the sidebar lists the table.
    await page
      .locator(".sql-tree-item")
      .filter({
        has: page.locator(".sql-tree-item-name", {
          hasText: new RegExp(`^${table}$`),
        }),
      })
      .first()
      .waitFor({ state: "visible", timeout: 150_000 });

    await runSql(page, `SELECT * FROM ${table} LIMIT 3;`);
    const pagerInfo = page.locator(".sql-result-pager-info").first();
    await expect(pagerInfo).toContainText("of 3", { timeout: 40_000 });

    // Edit the "name" cell (3rd column: row-select, id, name) of row 1.
    const nameCell = page
      .locator(".sql-result-table tbody tr")
      .first()
      .locator("td:nth-child(3)");
    await nameCell.dblclick();
    const input = page.locator(".sql-cell-input").first();
    await expect(input).toBeVisible();
    await input.fill(`Edited ${id}`);
    await input.press("Enter");

    const commit = page.locator(".sql-edit-commit-btn");
    await expect(commit).toBeVisible();
    await commit.click();

    // After UPDATE + refetch the LIMIT must be preserved → still 3 rows.
    await expect(pagerInfo).toContainText("of 3", { timeout: 40_000 });
    await expect(pagerInfo).not.toContainText(/of (10|20)\b/);
  });
}
