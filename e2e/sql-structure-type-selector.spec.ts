import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// Update 2: A column whose committed type isn't one of the built-in presets
// — e.g. Postgres `character varying(15)` (how PGlite reports `varchar(15)`),
// or any parameterized type — must NOT make the View/Edit Structure type
// picker show "No matching built-in types." Opening the list should reveal
// the full set of built-in types while preserving the column's real type.
// The PgTypeSelector / DuckDb equivalents share `computeVisibleTypeGroups`
// (unit-tested separately); this exercises the live Postgres wiring against
// the reported northwind `categories.category_name` scenario.
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

test("postgres structure editor — a `character varying(n)` column lists all built-in types", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/playground/postgres");
  await page
    .locator("button.run-btn-split-main, button.run-btn")
    .first()
    .waitFor({ state: "visible", timeout: 150_000 });

  // Recreate the reported shape: a varchar(n) column, which PGlite introspects
  // back as `character varying(15)`.
  await runSql(
    page,
    "CREATE TABLE cat_demo (id smallint, cname character varying(15));",
  );
  await expect(page.locator(".run-btn-spinner")).toHaveCount(0, {
    timeout: 60_000,
  });

  // Open View/Edit Structure from the schema-tree context menu.
  const treeRow = page
    .locator(".sql-tree-item")
    .filter({
      has: page.locator(".sql-tree-item-name", { hasText: /^cat_demo$/ }),
    })
    .first();
  await treeRow.waitFor({ state: "visible", timeout: 40_000 });
  await treeRow.click({ button: "right" });
  await page
    .locator(".example-item", { hasText: "View/Edit Structure" })
    .click();

  const drawer = page.locator(".sql-modify-drawer");
  await expect(drawer).toBeVisible();

  // The second column (cname) keeps its introspected type verbatim.
  const cnameGroup = drawer.locator(".playground-type-input-group").nth(1);
  await expect(cnameGroup.locator("input.playground-type-input")).toHaveValue(
    "character varying(15)",
  );

  // Opening its type list shows the built-in types — NOT "No matching
  // built-in types" (the bug).
  await cnameGroup.locator('[aria-label="Open type list"]').click();
  const popup = page.locator(".playground-type-popup");
  await expect(popup).toBeVisible();
  await expect(popup.locator(".playground-type-empty")).toHaveCount(0);
  await expect(
    popup.locator(".bui-select-item", { hasText: /^varchar$/ }),
  ).toBeVisible();
  await expect(
    popup.locator(".bui-select-item", { hasText: /^text$/ }),
  ).toBeVisible();
});
