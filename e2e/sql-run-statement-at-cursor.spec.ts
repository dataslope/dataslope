import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// Run statement at cursor (Phase 4 / §9 missing IDE feature).
//
// In a multi-statement document, Ctrl/⌘+Enter (no selection) runs only the
// statement under the cursor instead of the whole tab. Implemented in the
// shared editor keymap (editorSetup) + the pure statementAtCursor helper, so
// it's engine-agnostic — exercised here on SQLite. A single-statement tab is
// unaffected (still runs everything), and Ctrl/⌘+Shift+Enter forces run-all.
// ─────────────────────────────────────────────────────────────────────

test("Ctrl/Cmd+Enter runs only the statement under the cursor", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/playground/sqlite");
  await page
    .locator(".sql-tree-item")
    .filter({ has: page.locator(".sql-tree-item-name", { hasText: /^users$/ }) })
    .first()
    .waitFor({ state: "visible", timeout: 150_000 });

  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(
    "SELECT 1 AS one;\nSELECT 2 AS two;\nSELECT 3 AS three;",
  );

  // Put the (empty) cursor inside the middle statement, then run with the
  // keyboard — no selection, multiple statements → run statement at cursor.
  await page.locator(".cm-line").nth(1).click();
  await page.keyboard.press("ControlOrMeta+Enter");

  // Exactly one result set came back (the middle statement). If "run all" had
  // fired we'd get three sets and a result-set tab bar.
  const grid = page.locator(".sql-result-table");
  await expect(grid.getByText("two", { exact: true })).toBeVisible({
    timeout: 40_000,
  });
  await expect(grid.getByText("2", { exact: true })).toBeVisible();
  await expect(page.locator(".sql-result-set-tabs")).toHaveCount(0);
  await expect(grid.getByText("one", { exact: true })).toHaveCount(0);
  await expect(grid.getByText("three", { exact: true })).toHaveCount(0);
});
