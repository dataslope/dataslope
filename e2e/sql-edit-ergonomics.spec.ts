import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// Cell-editing ergonomics (UX-10), all three engines:
//   • a pending cell edit shows a per-cell discard "✕" that reverts just
//     that cell (without touching other pending edits);
//   • Ctrl/⌘+Enter commits the pending edits (when focus isn't in the
//     SQL editor, whose own keymap owns that chord for "run").
// The feature lives entirely in the shared ResultView.
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

const ENGINES: { id: string; route: string; table: string }[] = [
  { id: "SQLite", route: "/playground/sqlite", table: "users" },
  { id: "PostgreSQL", route: "/playground/postgres", table: "users" },
  { id: "DuckDB", route: "/playground/duckdb", table: "customers" },
];

for (const { id, route, table } of ENGINES) {
  test(`${id}: per-cell discard + Ctrl/Cmd+Enter commit`, async ({ page }) => {
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
    await input.fill("Zed");
    await input.press("Enter");

    // A pending edit → the cell shows "Zed" and a discard ✕; the footer
    // commit button appears.
    await expect(nameCell).toContainText("Zed");
    const discard = nameCell.locator(".sql-cell-discard");
    await expect(discard).toHaveCount(1);
    const commit = page.locator(".sql-edit-commit-btn");
    await expect(commit).toBeVisible();

    // (1) Per-cell discard reverts just this cell — no commit, no DB write.
    await nameCell.hover();
    await discard.click();
    await expect(nameCell.locator(".sql-cell-discard")).toHaveCount(0);
    await expect(commit).toBeHidden();
    await expect(nameCell).not.toContainText("Zed");

    // (2) Re-edit, then commit with the keyboard (Ctrl/⌘+Enter). Focus is on
    //     the grid (the input blurred on Enter), not the SQL editor, so the
    //     shortcut commits rather than re-running the query.
    await nameCell.dblclick();
    await page.locator(".sql-cell-input").first().fill("Zed");
    await page.locator(".sql-cell-input").first().press("Enter");
    await expect(commit).toBeVisible();
    await page.keyboard.press("ControlOrMeta+Enter");

    // The chord committed (not re-ran the query): a success toast confirms the
    // UPDATE, and the pending-edit footer clears. We don't assert the edited
    // row's *position* after refetch — an unordered LIMIT re-fetch can reorder
    // rows under MVCC (sql-edit-refetch.spec.ts likewise asserts only the count).
    await expect(
      page.locator(".toast-title", { hasText: "Updated 1 cell" }),
    ).toBeVisible({ timeout: 40_000 });
    await expect(commit).toBeHidden();
    await expect(pagerInfo).toContainText("of 3");
  });
}
