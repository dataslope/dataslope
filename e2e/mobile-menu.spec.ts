import { test, expect, type Locator } from "@playwright/test";

// Verifies the mobile playground menu behaviour:
//  - Update 1: the header workspace badge is hidden on mobile.
//  - Update 5 (prior batch): the database selector is in the SQL mobile drawer.
//  - Backdrop dismiss: while a sub-sheet is open the parent menu acts as a
//    backdrop — tapping any row just closes the sub-sheet without opening the
//    tapped item.
test.use({ viewport: { width: 390, height: 844 } });

/** Tap at the centre of `row` via the mouse, so the click lands on whatever
 *  is topmost there (the dismiss-catch overlay while a sub-sheet is open),
 *  not necessarily the row's own button. */
async function tapRow(page: import("@playwright/test").Page, row: Locator) {
  const box = await row.boundingBox();
  if (!box) throw new Error("row has no bounding box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test("SQL mobile menu: badge hidden, DB selector present, sub-sheet dismisses on background tap", async ({
  page,
}) => {
  await page.goto("/playground/postgres");
  await expect(page.locator(".pyodide-loading")).toBeHidden({
    timeout: 120_000,
  });

  // Update 1: the header workspace badge is hidden on the mobile viewport.
  await expect(page.locator(".workspace-badge")).toBeHidden();

  await page.locator(".mobile-menu-btn").click();
  const menu = page.locator(".mobile-menu-drawer[aria-label='Menu']");
  await expect(menu).toBeVisible();

  // The database selector is rendered inside the drawer.
  await expect(menu.locator(".mobile-menu-db-selector")).toBeVisible();

  // Open the "Export DB" sub-sheet.
  await menu.locator(".mobile-menu-action", { hasText: "Export DB" }).click();
  const exportSheet = page.locator(
    ".mobile-menu-nested-drawer[aria-label='Export DB']",
  );
  await expect(exportSheet).toBeVisible();

  // Tapping the "Import" row now lands on the dismiss-catch: it closes
  // "Export DB" and must NOT open "Import".
  await tapRow(page, menu.locator(".mobile-menu-action", { hasText: "Import" }));
  await expect(exportSheet).toBeHidden();
  await expect(
    page.locator(".mobile-menu-nested-drawer[aria-label='Import']"),
  ).toBeHidden();
});

test("non-SQL mobile menu: badge hidden, sub-sheet dismisses on background tap", async ({
  page,
}) => {
  await page.goto("/playground/javascript");
  await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 120_000 });

  await expect(page.locator(".workspace-badge")).toBeHidden();

  await page.locator(".mobile-menu-btn").click();
  const menu = page.locator(".mobile-menu-drawer[aria-label='Menu']");
  await expect(menu).toBeVisible();

  await menu.locator(".mobile-menu-action", { hasText: "Export" }).click();
  const exportSheet = page.locator(
    ".mobile-menu-nested-drawer[aria-label='Export']",
  );
  await expect(exportSheet).toBeVisible();

  // Tapping the "Files" row closes "Export" without opening "Files".
  await tapRow(page, menu.locator(".mobile-menu-action", { hasText: "Files" }));
  await expect(exportSheet).toBeHidden();
  await expect(
    page.locator(".mobile-menu-nested-drawer[aria-label='Files']"),
  ).toBeHidden();
});
