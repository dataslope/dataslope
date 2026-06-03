import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// "Create Index" / "Create View" schema-tree actions (UX-11).
// The INDEXES and VIEWS sections each gained a "+" that opens a shared,
// prop-controlled dialog; on submit it runs standard cross-engine DDL and
// refreshes the sidebar. Verified live on all three engines — the dialogs
// and the `buildCreate{Index,View}Sql` builders are shared, so behaviour
// is identical; only the run/refresh callback is per-engine.
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
  { id: "SQLite", route: "/playground/sqlite" },
  { id: "PostgreSQL", route: "/playground/postgres" },
  { id: "DuckDB", route: "/playground/duckdb" },
];

for (const { id, route } of ENGINES) {
  test(`${id}: create an index and a view from the schema tree`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto(route);
    await page
      .locator("button.run-btn-split-main, button.run-btn")
      .first()
      .waitFor({ state: "visible", timeout: 150_000 });

    // A known table to target.
    await runSql(
      page,
      "CREATE TABLE widgets (id INTEGER, email TEXT, sku TEXT);",
    );
    await waitIdle(page);

    // ── Create Index ──
    await page.getByRole("button", { name: "Add index" }).click();
    const idx = page.locator(".sql-create-popup");
    await expect(idx).toBeVisible();

    // Wait for the just-created table to register, then target it.
    const tableSelect = idx.locator('select[aria-label="Table to index"]');
    await expect(
      tableSelect.locator("option", { hasText: /^widgets$/ }),
    ).toHaveCount(1, { timeout: 30_000 });
    await tableSelect.selectOption("widgets");

    // Pick a column; the index name auto-suggests and the SQL preview is live.
    await idx
      .locator(".sql-create-col", { hasText: "email" })
      .locator('input[type="checkbox"]')
      .check();
    await expect(idx.locator('input[aria-label="Index name"]')).toHaveValue(
      "idx_widgets_email",
    );
    await expect(idx.locator(".sql-create-preview")).toContainText(
      'CREATE INDEX IF NOT EXISTS "idx_widgets_email" ON "widgets" ("email");',
    );

    await idx.getByRole("button", { name: "Create Index" }).click();
    await expect(idx).toHaveCount(0);
    await expect(
      page.locator(".toast-title", {
        hasText: 'Created index "idx_widgets_email"',
      }),
    ).toBeVisible();

    // ── Create View ──
    await page.getByRole("button", { name: "Add view" }).click();
    const view = page.locator(".sql-create-popup");
    await expect(view).toBeVisible();
    await view.locator('input[aria-label="View name"]').fill("widget_emails");
    await view
      .locator('textarea[aria-label="View SELECT statement"]')
      .fill("SELECT id, email FROM widgets");
    await expect(view.locator(".sql-create-preview")).toContainText(
      'CREATE VIEW "widget_emails" AS',
    );

    await view.getByRole("button", { name: "Create View" }).click();
    await expect(view).toHaveCount(0);
    await expect(
      page.locator(".toast-title", {
        hasText: 'Created view "widget_emails"',
      }),
    ).toBeVisible();

    // The view is now queryable — proves the DDL really ran.
    await runSql(page, "SELECT * FROM widget_emails;");
    await waitIdle(page);
    await expect(page.locator(".sql-result-table")).toBeVisible({
      timeout: 40_000,
    });
  });
}
