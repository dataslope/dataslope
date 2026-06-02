import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// Run statement at cursor (Phase 4 / §9 missing IDE feature).
//
// In a multi-statement tab, running with no selection executes only the
// statement under the cursor — via the keyboard (Ctrl/⌘+Enter) and via a
// discoverable toolbar "Run statement" split button (whose dropdown also
// offers "Run All"). A single-statement tab keeps the plain "Run" button and
// runs everything. Engine-agnostic (shared editor + toolbar) → tested on
// SQLite.
// ─────────────────────────────────────────────────────────────────────

const THREE = "SELECT 1 AS one;\nSELECT 2 AS two;\nSELECT 3 AS three;";

test("run statement at cursor — keyboard, toolbar button, and dropdown", async ({
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
  const grid = page.locator(".sql-result-table");
  const setTabs = page.locator(".sql-result-set-tabs");
  const splitMain = page.locator(".run-btn-split-main");

  const typeIntoEditor = async (text: string) => {
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Delete");
    await page.keyboard.insertText(text);
  };

  // A multi-statement tab (no selection) surfaces the "Run statement" split.
  await typeIntoEditor(THREE);
  await expect(splitMain).toHaveText(/Run statement/);

  // (1) Keyboard: cursor in the middle statement → only it runs.
  await page.locator(".cm-line").nth(1).click();
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(grid.getByText("two", { exact: true })).toBeVisible({
    timeout: 40_000,
  });
  await expect(setTabs).toHaveCount(0);
  await expect(grid.getByText("one", { exact: true })).toHaveCount(0);

  // (2) Toolbar button: cursor in the third statement → only it runs.
  await page.locator(".cm-line").nth(2).click();
  await splitMain.click();
  await expect(grid.getByText("three", { exact: true })).toBeVisible({
    timeout: 40_000,
  });
  await expect(setTabs).toHaveCount(0);
  await expect(grid.getByText("two", { exact: true })).toHaveCount(0);

  // (3) Dropdown "Run All" → all three statements run (a result-set tab bar).
  await page.locator(".run-btn-split-chevron").click();
  await page.getByRole("menuitem", { name: "Run All" }).click();
  await expect(setTabs).toBeVisible({ timeout: 40_000 });
  await expect(setTabs.locator("[role=tab], button")).toHaveCount(3);

  // (4) A single-statement tab falls back to the plain "Run" button.
  await typeIntoEditor("SELECT 42 AS answer;");
  await expect(page.locator(".run-btn")).toHaveText(/^Run$/);
  await expect(splitMain).toHaveCount(0);
});
