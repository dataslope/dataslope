import { test, expect, type Page } from "@playwright/test";

// Schema pane: a table name clipped by CSS ellipsis gets a `title` tooltip
// leading with the FULL name; names that fit keep the plain hint. SchemaItem
// is shared by all three engines, so SQLite (local sample, no CDN) suffices.

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

const HINT = /^Double-click to preview, click to (expand|collapse)$/;

test("schema tree, clipped table names lead the tooltip with the full name", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/playground/sqlite");

  const treeRow = (name: RegExp | string) =>
    page
      .locator(".sql-tree-item")
      .filter({ has: page.locator(".sql-tree-item-name", { hasText: name }) })
      .first();

  // Default sample loaded.
  await treeRow(/^users$/).waitFor({ state: "visible", timeout: 150_000 });

  // A short name fits → the tooltip is just the hint, with no name prefix.
  await expect(treeRow(/^users$/)).toHaveAttribute("title", HINT);

  // A name far too long for the sidebar width is clipped → the tooltip leads
  // with the full name (the DOM text stays complete; only CSS clips it).
  const longName =
    "this_is_an_extremely_long_table_name_that_gets_clipped_with_an_ellipsis";
  await runSql(page, `CREATE TABLE ${longName} (id INTEGER);`);
  await expect(page.locator(".run-btn-spinner")).toHaveCount(0, {
    timeout: 60_000,
  });

  const longRow = treeRow(longName);
  await longRow.waitFor({ state: "visible", timeout: 40_000 });
  await expect(longRow).toHaveAttribute(
    "title",
    new RegExp(
      `^${longName}, Double-click to preview, click to (expand|collapse)$`,
    ),
  );
});
