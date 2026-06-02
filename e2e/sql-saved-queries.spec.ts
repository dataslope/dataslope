import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// Saved queries ("star" a history entry). Lives in the shared History
// pane: each history entry has a star toggle; starred queries appear in a
// "Saved queries" section that persists to localStorage (survives a
// history clear / reload). Verified on all three engines.
// ─────────────────────────────────────────────────────────────────────

async function runSql(page: Page, sql: string) {
  const editor = page.locator(".cm-content").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(sql);
  await page
    .locator("button.run-btn-split-main, button.run-btn")
    .first()
    .click();
}

async function openHistory(page: Page) {
  await page.locator('button[aria-label="Query history"]').first().click();
}

const ENGINES: { id: string; route: string; table: string }[] = [
  { id: "SQLite", route: "/playground/sqlite", table: "users" },
  { id: "PostgreSQL", route: "/playground/postgres", table: "users" },
  { id: "DuckDB", route: "/playground/duckdb", table: "customers" },
];

for (const { id, route, table } of ENGINES) {
  test(`${id}: star a query into "Saved queries"`, async ({ page }) => {
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

    await runSql(page, "SELECT 42 AS saved_answer;");
    await expect(page.locator(".run-btn-spinner")).toHaveCount(0, {
      timeout: 60_000,
    });

    await openHistory(page);
    const star = page.locator(".sql-history-save-btn").first();
    await expect(star).toBeVisible();

    // Star it → a "Saved queries" section appears with the query.
    await star.click();
    const savedSection = page.locator(".sql-saved-section");
    await expect(savedSection).toBeVisible();
    await expect(savedSection).toContainText("saved_answer");
    await expect(page.locator(".sql-history-save-btn.is-saved")).toHaveCount(1);

    // Unstar → the section goes away.
    await star.click();
    await expect(savedSection).toHaveCount(0);
  });
}

// Persistence + load-into-editor, verified once (the pane is shared, so this
// is engine-independent; SQLite keeps the run fast).
test("SQLite: saved queries persist across reload and load into the editor", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/playground/sqlite");
  await page
    .locator(".sql-tree-item")
    .filter({
      has: page.locator(".sql-tree-item-name", { hasText: /^users$/ }),
    })
    .first()
    .waitFor({ state: "visible", timeout: 150_000 });

  await runSql(page, "SELECT 7 AS lucky_number;");
  await expect(page.locator(".run-btn-spinner")).toHaveCount(0, {
    timeout: 60_000,
  });
  await openHistory(page);
  await page.locator(".sql-history-save-btn").first().click();
  await expect(page.locator(".sql-saved-section")).toContainText("lucky_number");

  // Reload: the engine re-boots, but the saved list is restored from
  // localStorage as soon as the History pane is reopened.
  await page.reload();
  await page
    .locator(".sql-tree-item")
    .filter({
      has: page.locator(".sql-tree-item-name", { hasText: /^users$/ }),
    })
    .first()
    .waitFor({ state: "visible", timeout: 150_000 });
  await openHistory(page);
  const savedSection = page.locator(".sql-saved-section");
  await expect(savedSection).toContainText("lucky_number");

  // "Open in query tab" loads the saved SQL back into the editor.
  await savedSection.locator(".sql-history-open-btn").first().click();
  await expect(page.locator(".cm-content").first()).toContainText(
    "lucky_number",
  );
});
