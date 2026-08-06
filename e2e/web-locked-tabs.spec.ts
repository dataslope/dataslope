import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// The HTML/CSS/JS playground has a fixed index.html / styles.css /
// script.js trio: `disableAddFile` hides the "+" affordances,
// `hideFilesPane` hides the file tree, and `lockWorkspaceFiles` takes
// away closing, deleting, duplicating, and renaming.
//
// Those go together. Closing a tab hides its editor but keeps the file,
// and the Files pane is what reopens it — so an adapter with no Files
// pane and no way to add a file must not let one be closed either, or
// the file becomes unreachable in tabbed mode. Renaming is locked
// because the trio references itself by name, so a rename breaks the
// composed page silently.
//
// Split view hid the problem (it renders every workspace file whatever
// the open tabs are), so these assertions run against tabbed mode.
// ─────────────────────────────────────────────────────────────────────

const TABBAR = ".playground-file-tabbar";

async function gotoTabbedWeb(page: Page) {
  // Tabbed (not split) editor layout; the preference is per-adapter
  // localStorage, read on mount.
  await page.addInitScript(() => {
    localStorage.setItem("playground_web_splitview", "false");
  });
  await page.goto("/playground/web", { waitUntil: "domcontentloaded" });
  await page.locator(TABBAR).waitFor({ state: "attached" });
  await page.addStyleTag({
    content:
      ".pyodide-loading,.playground-boot-overlay{display:none!important}nextjs-portal{display:none!important}",
  });
}

function tabNames(page: Page) {
  return page.$$eval(`${TABBAR} .playground-tab-title`, (nodes) =>
    nodes.map((n) => n.textContent),
  );
}

test.describe("HTML playground: the file set is locked", () => {
  test("no close button and no add button on any tab", async ({ page }) => {
    await gotoTabbedWeb(page);

    expect(await tabNames(page)).toEqual([
      "index.html",
      "styles.css",
      "script.js",
    ]);

    // No ✕ on any tab, so a file cannot be closed into unreachability.
    await expect(page.locator(`${TABBAR} .playground-tab-close`)).toHaveCount(0);
    // And no "+" to add a fourth file.
    await expect(page.locator(`${TABBAR} .playground-tab-add`)).toHaveCount(0);
  });

  test("a tab has no context menu at all", async ({ page }) => {
    await gotoTabbedWeb(page);

    const tab = page.locator(`${TABBAR} .playground-tab`, {
      hasText: "styles.css",
    });
    await tab.click({ button: "right" });
    // Every per-tab action is gone, so TabItem renders no menu.
    await expect(page.locator(".bui-popup .ex-title")).toHaveCount(0);

    // Double-click is the other way into rename; it must be inert too.
    await tab.dblclick();
    await expect(page.locator(".sql-rename-input")).toHaveCount(0);
    expect(await tabNames(page)).toEqual([
      "index.html",
      "styles.css",
      "script.js",
    ]);
  });

  test("switching to split view and back leaves all three tabs", async ({
    page,
  }) => {
    await gotoTabbedWeb(page);

    // The layout toggle must not be a back door to a different file set.
    await page.evaluate(() => {
      localStorage.setItem("playground_web_splitview", "true");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("playground_web_splitview", "false");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(TABBAR).waitFor({ state: "attached" });

    expect(await tabNames(page)).toEqual([
      "index.html",
      "styles.css",
      "script.js",
    ]);
  });
});

test.describe("other playgrounds keep their tab affordances", () => {
  test("python can still close and add tabs", async ({ page }) => {
    await page.goto("/playground/python", { waitUntil: "domcontentloaded" });
    await page.locator(TABBAR).waitFor({ state: "attached" });
    await page.addStyleTag({
      content:
        ".pyodide-loading,.playground-boot-overlay{display:none!important}nextjs-portal{display:none!important}",
    });

    // The lock is per-adapter, so nothing here should have changed.
    await expect(page.locator(`${TABBAR} .playground-tab-add`)).toHaveCount(1);

    await page.locator(`${TABBAR} .playground-tab-add`).click();
    await expect
      .poll(() => tabNames(page).then((n) => n.length))
      .toBe(2);

    // With two tabs open both are closeable.
    await expect(page.locator(`${TABBAR} .playground-tab-close`)).toHaveCount(2);
    await page
      .locator(`${TABBAR} .playground-tab`)
      .nth(1)
      .locator(".playground-tab-close")
      .click();
    await expect
      .poll(() => tabNames(page).then((n) => n.length))
      .toBe(1);
  });
});
