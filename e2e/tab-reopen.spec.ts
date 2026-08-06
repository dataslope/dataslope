import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// Closing a file tab hides its editor but keeps the file in the
// workspace, and the Files pane was the only way back. The web
// playground sets `hideFilesPane`, so a closed file there was
// unreachable: the tab was gone, the pane that would reopen it does not
// exist, and switching to split view and back was the only workaround.
//
// The fix is on the tab strip itself: the "+" becomes a menu listing the
// closed files under a "Reopen" heading, and stays a plain single-click
// button while there is nothing to reopen.
//
// Run against /playground/web on purpose. It is the reported case, and
// its runtime is a sandboxed iframe rather than a CDN-fetched WASM
// toolchain, so the test does not depend on a cold Pyodide/browsercc
// download to exercise pure tab-strip state.
// ─────────────────────────────────────────────────────────────────────

const TABBAR = ".playground-file-tabbar";
const ADD = `${TABBAR} .playground-tab-add`;

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

test.describe("Reopening a closed file tab", () => {
  test("the + lists closed files and restores them in place", async ({
    page,
  }) => {
    await gotoTabbedWeb(page);

    const before = await tabNames(page);
    expect(before).toEqual(["index.html", "styles.css", "script.js"]);

    // With every file open there is nothing to reopen, so the "+" keeps
    // its plain-button behaviour. (The web adapter sets `disableAddFile`,
    // so here that means no button at all.)
    await expect(page.locator(`${ADD}[aria-haspopup]`)).toHaveCount(0);

    // Close the middle tab.
    await page
      .locator(`${TABBAR} .playground-tab`)
      .nth(1)
      .locator(".playground-tab-close")
      .click();
    await expect
      .poll(() => tabNames(page))
      .toEqual(["index.html", "script.js"]);

    // Now the "+" is a menu.
    const add = page.locator(ADD);
    await expect(add).toHaveAttribute("aria-haspopup", /menu/);
    await add.click();

    await expect(page.locator(".playground-tab-add-heading")).toHaveText(
      "Reopen",
    );
    const items = await page.$$eval(
      ".playground-tab-add-menu .ex-title",
      (nodes) => nodes.map((n) => n.textContent?.trim()),
    );
    // No "New file" row: this adapter disables adding files.
    expect(items).toEqual(["styles.css"]);

    // Reopening puts the tab back where it belongs in workspace order,
    // rather than appending it to the end of the strip.
    await page
      .locator(".playground-tab-add-menu .example-item", {
        hasText: "styles.css",
      })
      .first()
      .click();
    await expect
      .poll(() => tabNames(page))
      .toEqual(["index.html", "styles.css", "script.js"]);

    // And the reopened tab is the active one.
    await expect(
      page.locator(`${TABBAR} .playground-tab.active .playground-tab-title`),
    ).toHaveText("styles.css");

    // Back to nothing closed, so the menu affordance goes away again.
    await expect(page.locator(`${ADD}[aria-haspopup]`)).toHaveCount(0);
  });

  test("the reopened file keeps the edits made before it was closed", async ({
    page,
  }) => {
    await gotoTabbedWeb(page);

    // Focus the CSS tab and type into it.
    await page
      .locator(`${TABBAR} .playground-tab`, { hasText: "styles.css" })
      .click();
    const editor = page.locator(".cm-content").first();
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("/* marker-42 */");
    await expect(editor).toContainText("marker-42");

    // Close it, then bring it back.
    await page
      .locator(`${TABBAR} .playground-tab`, { hasText: "styles.css" })
      .locator(".playground-tab-close")
      .click();
    await expect
      .poll(() => tabNames(page))
      .toEqual(["index.html", "script.js"]);

    await page.locator(ADD).click();
    await page
      .locator(".playground-tab-add-menu .example-item", {
        hasText: "styles.css",
      })
      .first()
      .click();

    // Closing a tab hides an editor; it must never discard the buffer.
    await expect(page.locator(".cm-content").first()).toContainText(
      "marker-42",
    );
  });
});
