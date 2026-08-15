import { test, expect, type Page } from "@playwright/test";

// Inline enum dropdown editor, Postgres + DuckDB: an enum column renders a
// <select> of its declared labels on double-click; the committed value is the
// label and the engine casts on write. SQLite has no enum type. Labels ride
// listColumns into the shared ResultView via ColumnKeyHints.enums.

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
  { id: "PostgreSQL", route: "/playground/postgres" },
  { id: "DuckDB", route: "/playground/duckdb" },
];

for (const { id, route } of ENGINES) {
  test(`${id}: enum column edits via an inline dropdown`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(route);
    await page
      .locator("button.run-btn-split-main, button.run-btn")
      .first()
      .waitFor({ state: "visible", timeout: 150_000 });

    await runSql(
      page,
      [
        "CREATE TYPE mood AS ENUM('sad','ok','happy');",
        "CREATE TABLE feels (id INTEGER PRIMARY KEY, m mood);",
        "INSERT INTO feels VALUES (1,'ok'),(2,'sad');",
      ].join("\n"),
    );
    await waitIdle(page);

    // Wait for `feels` to land in the sidebar, the same schema refresh
    // populates its columns (incl. the enum labels), so the dropdown is ready.
    await page
      .locator(".sql-tree-item-name", { hasText: /^feels$/ })
      .first()
      .waitFor({ state: "visible", timeout: 40_000 });

    await runSql(page, "SELECT * FROM feels;");
    await expect(page.locator(".sql-result-table tbody tr")).toHaveCount(2, {
      timeout: 40_000,
    });
    await waitIdle(page);

    // The `m` cell of the row currently showing 'ok' (row-select, id, m).
    const okCell = page
      .locator(".sql-result-table tbody td", { hasText: /^ok$/ })
      .first();
    await okCell.dblclick();

    // It's a dropdown of the enum's labels, not a free-text input.
    const select = page.locator("select.sql-cell-select");
    await expect(select).toBeVisible();
    await expect(select.locator("option")).toHaveText(["sad", "ok", "happy"]);

    await select.selectOption("happy");

    // Pending edit → commit it.
    const commit = page.locator(".sql-edit-commit-btn");
    await expect(commit).toBeVisible();
    await commit.click();

    await expect(
      page.locator(".toast-title", { hasText: "Updated 1 cell" }),
    ).toBeVisible({ timeout: 40_000 });

    // The new label persisted (row may move under MVCC, assert presence).
    await expect(page.locator(".sql-result-table")).toContainText("happy", {
      timeout: 40_000,
    });
  });
}
