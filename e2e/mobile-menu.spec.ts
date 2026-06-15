import { test, expect } from "@playwright/test";

// Verifies the mobile playground menu changes:
//  - Update 1: the header workspace badge is hidden on mobile.
//  - Update 5: the database selector is surfaced in the SQL mobile drawer.
//  - Update 6: mobile drawer sub-sheets are mutually exclusive (opening one
//    closes any other).
// Postgres is used because its loading overlay unmounts on load (clean
// "loaded" signal) and its default sample has tables (so "Export DB" shows).
test.use({ viewport: { width: 390, height: 844 } });

test("SQL mobile menu: badge hidden, DB selector present, sub-sheets are mutually exclusive", async ({
  page,
}) => {
  await page.goto("/playground/postgres");

  // Wait for the engine to boot — the loading overlay is removed once ready.
  await expect(page.locator(".pyodide-loading")).toBeHidden({
    timeout: 120_000,
  });

  // Update 1: the header workspace badge is hidden on the mobile viewport.
  await expect(page.locator(".workspace-badge")).toBeHidden();

  // The hamburger is the only header action on mobile.
  await page.locator(".mobile-menu-btn").click();
  const menu = page.locator(".mobile-menu-drawer[aria-label='Menu']");
  await expect(menu).toBeVisible();

  // Update 5: the database selector is rendered inside the drawer.
  await expect(menu.locator(".mobile-menu-db-selector")).toBeVisible();

  // Update 6: open the "Export DB" sub-sheet …
  await menu.locator(".mobile-menu-action", { hasText: "Export DB" }).click();
  const exportSheet = page.locator(
    ".mobile-menu-nested-drawer[aria-label='Export DB']",
  );
  await expect(exportSheet).toBeVisible();

  // … then select "Import" from the still-visible parent menu above it (the
  // user's reported case). The open "Export DB" sheet must close rather than
  // leave both stacked.
  await menu.locator(".mobile-menu-action", { hasText: "Import" }).click();
  const importSheet = page.locator(
    ".mobile-menu-nested-drawer[aria-label='Import']",
  );
  await expect(importSheet).toBeVisible();
  await expect(exportSheet).toBeHidden();
});

test("non-SQL mobile menu: badge hidden, sub-sheets are mutually exclusive", async ({
  page,
}) => {
  await page.goto("/playground/javascript");

  // The language playgrounds render inline (no blocking overlay); the editor
  // mounting is a good "ready" signal.
  await expect(page.locator(".cm-editor")).toBeVisible({ timeout: 120_000 });

  // Update 1: the header workspace badge is hidden on mobile here too.
  await expect(page.locator(".workspace-badge")).toBeHidden();

  await page.locator(".mobile-menu-btn").click();
  const menu = page.locator(".mobile-menu-drawer[aria-label='Menu']");
  await expect(menu).toBeVisible();

  // Update 6 (generic playground path): open "Export", then select the
  // top-most "Files" item still visible above it — "Export" must close.
  await menu.locator(".mobile-menu-action", { hasText: "Export" }).click();
  const exportSheet = page.locator(
    ".mobile-menu-nested-drawer[aria-label='Export']",
  );
  await expect(exportSheet).toBeVisible();

  await menu.locator(".mobile-menu-action", { hasText: "Files" }).click();
  const filesSheet = page.locator(
    ".mobile-menu-nested-drawer[aria-label='Files']",
  );
  await expect(filesSheet).toBeVisible();
  await expect(exportSheet).toBeHidden();
});
