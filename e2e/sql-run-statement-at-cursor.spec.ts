import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// Run controls for multi-statement tabs (Phase 4 / §9 IDE feature).
//
// Split-button rules — the dropdown never duplicates the primary action:
//   • Multi-statement, no selection → primary "Run All";   dropdown: "Run
//     statement at cursor" (Ctrl/⌘+Enter still runs just that statement).
//   • Selection active             → primary "Run Selection"; dropdown: "Run
//     All" (no duplicate "Run Selection").
//   • Single statement             → plain "Run" button (runs everything).
// Engine-agnostic (shared editor + toolbar) → tested on SQLite.
// ─────────────────────────────────────────────────────────────────────

const THREE = "SELECT 1 AS one;\nSELECT 2 AS two;\nSELECT 3 AS three;";

test("run controls — Run All default, run-at-cursor in dropdown, no duplicate actions", async ({
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
  const chevron = page.locator(".run-btn-split-chevron");
  const dropdown = page.locator(".run-split-dropdown");

  const typeIntoEditor = async (text: string) => {
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Delete");
    await page.keyboard.insertText(text);
  };

  // Multi-statement, no selection → primary action is "Run All".
  await typeIntoEditor(THREE);
  await expect(splitMain).toHaveText(/Run All/);

  // …and the dropdown offers ONLY "Run statement at cursor" (no duplicate).
  await chevron.click();
  await expect(dropdown.getByRole("menuitem")).toHaveCount(1);
  await expect(
    dropdown.getByRole("menuitem", { name: "Run statement at cursor" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // (1) Keyboard Ctrl/⌘+Enter with the cursor in the middle statement → only it.
  await page.locator(".cm-line").nth(1).click();
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(grid.getByText("two", { exact: true })).toBeVisible({
    timeout: 40_000,
  });
  await expect(setTabs).toHaveCount(0);
  await expect(grid.getByText("one", { exact: true })).toHaveCount(0);

  // (2) Dropdown "Run statement at cursor" with the cursor in the third → only it.
  await page.locator(".cm-line").nth(2).click();
  await chevron.click();
  await dropdown.getByRole("menuitem", { name: "Run statement at cursor" }).click();
  await expect(grid.getByText("three", { exact: true })).toBeVisible({
    timeout: 40_000,
  });
  await expect(setTabs).toHaveCount(0);
  await expect(grid.getByText("two", { exact: true })).toHaveCount(0);

  // (3) The primary "Run All" button runs every statement (a result-set tab bar).
  await splitMain.click();
  await expect(setTabs).toBeVisible({ timeout: 40_000 });
  await expect(setTabs.locator("[role=tab], button")).toHaveCount(3);

  // (4) With a selection, the primary becomes "Run Selection" and the dropdown
  //     offers ONLY "Run All" — no duplicate "Run Selection".
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await expect(splitMain).toHaveText(/Run Selection/);
  await chevron.click();
  await expect(dropdown.getByRole("menuitem")).toHaveCount(1);
  await expect(dropdown.getByRole("menuitem", { name: "Run All" })).toBeVisible();
  await expect(
    dropdown.getByRole("menuitem", { name: "Run Selection" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");

  // (5) A single-statement tab falls back to the plain "Run" button.
  await typeIntoEditor("SELECT 42 AS answer;");
  await expect(page.locator(".run-btn")).toHaveText(/^Run$/);
  await expect(splitMain).toHaveCount(0);
});
