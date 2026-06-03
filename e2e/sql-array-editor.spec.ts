import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// Inline array / LIST editor (UX-04), Postgres + DuckDB.
// An array column (Postgres `integer[]`, DuckDB Arrow `list<...>`) renders
// as a JSON string and is edited as JSON; on commit the parsed JS array is
// written back and the engine binds it as a real array (Postgres via
// pglite, DuckDB via a bound LIST parameter). SQLite has no native array
// type, so it's excluded.
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

async function waitIdle(page: Page) {
  await expect(page.locator(".run-btn-spinner")).toHaveCount(0, {
    timeout: 60_000,
  });
}

const ENGINES = [
  {
    id: "PostgreSQL",
    route: "/playground/postgres",
    insert: "INSERT INTO arr VALUES (1, ARRAY[10,20,30]);",
  },
  {
    id: "DuckDB",
    route: "/playground/duckdb",
    insert: "INSERT INTO arr VALUES (1, [10,20,30]);",
  },
];

for (const { id, route, insert } of ENGINES) {
  test(`${id}: array column edits as JSON and round-trips`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(route);
    await page
      .locator("button.run-btn-split-main, button.run-btn")
      .first()
      .waitFor({ state: "visible", timeout: 150_000 });

    await runSql(
      page,
      `CREATE TABLE arr (id INTEGER PRIMARY KEY, nums INTEGER[]);\n${insert}`,
    );
    await waitIdle(page);

    // Wait for the table to register so the bare SELECT is flagged editable.
    await page
      .locator(".sql-tree-item-name", { hasText: /^arr$/ })
      .first()
      .waitFor({ state: "visible", timeout: 40_000 });

    await runSql(page, "SELECT * FROM arr;");
    await expect(page.locator(".sql-result-table tbody tr")).toHaveCount(1, {
      timeout: 40_000,
    });
    await waitIdle(page);

    // The array cell shows the JSON form `[10,20,30]`.
    const cell = page
      .locator(".sql-result-table tbody td", { hasText: "[10,20,30]" })
      .first();
    await expect(cell).toBeVisible();
    await cell.dblclick();

    const input = page.locator(".sql-cell-input").first();
    await expect(input).toBeVisible();
    await input.fill("[40,50]");
    await input.press("Enter");

    const commit = page.locator(".sql-edit-commit-btn");
    await expect(commit).toBeVisible();
    await commit.click();

    await expect(
      page.locator(".toast-title", { hasText: "Updated 1 cell" }),
    ).toBeVisible({ timeout: 40_000 });

    // The re-fetched array reflects the edit (written as a real array, then
    // read back as JSON) — and the old elements are gone.
    const numsCell = page
      .locator(".sql-result-table tbody tr")
      .first()
      .locator("td")
      .last();
    await expect(numsCell).toContainText("40", { timeout: 40_000 });
    await expect(numsCell).toContainText("50");
    await expect(numsCell).not.toContainText("20");
  });
}
