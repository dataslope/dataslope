import { test, expect, type Page } from "@playwright/test";

// "Explain" toolbar action: shows the query's execution plan in a read-only
// modal. SQLite uses EXPLAIN QUERY PLAN; Postgres/DuckDB use plain EXPLAIN.
// Shared ExplainPlanDialog + utils/explain.ts across all three engines.

async function typeInEditor(page: Page, sql: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(sql);
}

async function runSql(page: Page, sql: string) {
  await typeInEditor(page, sql);
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
  { id: "SQLite", route: "/playground/sqlite" },
  { id: "PostgreSQL", route: "/playground/postgres" },
  { id: "DuckDB", route: "/playground/duckdb" },
];

for (const { id, route } of ENGINES) {
  test(`${id}: Explain shows the query plan`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(route);
    await page
      .locator("button.run-btn-split-main, button.run-btn")
      .first()
      .waitFor({ state: "visible", timeout: 150_000 });

    await runSql(
      page,
      "CREATE TABLE widgets (id INTEGER, name TEXT); INSERT INTO widgets VALUES (1,'a'),(2,'b');",
    );
    await waitIdle(page);

    // Put a query in the editor (don't run it) and Explain it.
    await typeInEditor(page, "SELECT * FROM widgets WHERE id > 0;");
    await page.getByRole("button", { name: "Explain" }).click();

    const dlg = page.locator(".sql-explain-popup");
    await expect(dlg).toBeVisible();
    // The subtitle echoes the explained statement.
    await expect(dlg.locator(".sql-explain-subtitle")).toContainText("widgets");
    // The plan is non-empty and references the scanned table.
    const plan = dlg.locator(".sql-explain-plan");
    await expect(plan).toBeVisible();
    await expect(plan).not.toHaveText("(no plan returned)");
    await expect(plan).toContainText("widgets");

    // Closes cleanly (the footer's primary "Close" button).
    await dlg.locator("button.confirm-btn-primary").click();
    await expect(dlg).toHaveCount(0);
  });
}
