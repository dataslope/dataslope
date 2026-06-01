import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// Responsive / mobile layout coverage for the three SQL playgrounds
// (SQLite, Postgres, DuckDB). The desktop UI is a fixed 3-pane IDE; below
// the 768px breakpoint the shared SqlPlaygroundShell collapses it to a
// single full-width surface switched from a bottom tab bar
// (Schema / Editor / Results), driven by `data-mobile-pane` on
// `.playground-root`.
//
// These assertions deliberately do NOT wait for the WASM engine to finish
// booting: the layout (shell + sidebar + editor + results + bottom tabs)
// renders immediately and the tab switching is pure shell state + CSS, so
// the test stays fast and independent of the CDN that serves the engines.
// We just hide the boot overlay (and the dev-mode badge) so it doesn't
// cover the surfaces under test.
// ─────────────────────────────────────────────────────────────────────

const ENGINES = ["sqlite", "postgres", "duckdb"] as const;
const MOBILE = { width: 390, height: 844 };

async function gotoPlayground(page: Page, engine: string) {
  await page.goto(`/playground/${engine}`, { waitUntil: "domcontentloaded" });
  // The shell renders the layout synchronously; wait for the mobile tab bar
  // (always in the DOM) rather than for the engine to boot.
  await page.locator(".sql-mobile-tabs").waitFor({ state: "attached" });
  await page.locator(".sql-shell").waitFor({ state: "attached" });
  // Drop the full-screen boot overlay + the Next.js dev badge so they don't
  // intercept clicks / inflate layout during the test.
  await page.addStyleTag({
    content:
      ".pyodide-loading{display:none!important}nextjs-portal{display:none!important}",
  });
}

function hasNoHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    return de.scrollWidth <= de.clientWidth;
  });
}

test.describe("SQL playgrounds — mobile layout (390×844)", () => {
  test.use({ viewport: MOBILE, hasTouch: true, isMobile: true });

  for (const engine of ENGINES) {
    test(`${engine}: single-pane shell, no overflow, panes reachable`, async ({
      page,
    }) => {
      await gotoPlayground(page, engine);

      const root = page.locator(".playground-root");
      const sidebar = page.locator(".sql-sidebar");
      const editor = page.locator(".sql-editor-pane");
      const results = page.locator(".sql-results-pane");
      const tabBar = page.locator(".sql-mobile-tabs");

      // No horizontal page overflow — the core "unusable on mobile" bug.
      expect(await hasNoHorizontalOverflow(page)).toBe(true);

      // Bottom tab bar is the mobile navigation.
      await expect(tabBar).toBeVisible();

      // Default surface is the Editor.
      await expect(root).toHaveAttribute("data-mobile-pane", "editor");
      await expect(editor).toBeVisible();
      await expect(sidebar).toBeHidden();

      // Schema tab → the schema sidebar takes over full-screen.
      await tabBar.getByRole("tab", { name: "Schema" }).click();
      await expect(root).toHaveAttribute("data-mobile-pane", "schema");
      await expect(sidebar).toBeVisible();
      await expect(editor).toBeHidden();

      // Results tab → the results grid takes over.
      await tabBar.getByRole("tab", { name: "Results" }).click();
      await expect(root).toHaveAttribute("data-mobile-pane", "results");
      await expect(results).toBeVisible();
      await expect(editor).toBeHidden();
      await expect(sidebar).toBeHidden();

      // Back to Editor.
      await tabBar.getByRole("tab", { name: "Editor" }).click();
      await expect(root).toHaveAttribute("data-mobile-pane", "editor");
      await expect(editor).toBeVisible();

      // Still no overflow after switching panes.
      expect(await hasNoHorizontalOverflow(page)).toBe(true);
    });
  }

  // ── Request 3: per-query-tab bottom-pane memory ──────────────────────
  // Each query tab remembers which bottom pane it was last on; activating a
  // tab restores that pane (a brand-new tab defaults to Editor). Verified
  // engine-free with Schema/Editor — the Results-specific "empty ⇒ editor"
  // fallback is covered by the `paneForActivatedTab` unit test, since reaching
  // Results requires a booted engine + a query run.
  test("sqlite: each query tab restores its own bottom pane on activation", async ({
    page,
  }) => {
    await gotoPlayground(page, "sqlite");
    const root = page.locator(".playground-root");
    const tabBar = page.locator(".sql-mobile-tabs");
    const tabs = page.locator(".playground-tab");

    const initialCount = await tabs.count();

    // Put the first tab on the Schema pane.
    await tabs.first().click();
    await tabBar.getByRole("tab", { name: "Schema" }).click();
    await expect(root).toHaveAttribute("data-mobile-pane", "schema");

    // A brand-new query tab ("+") becomes active and defaults to the Editor,
    // not the previous tab's Schema pane.
    await page.locator(".playground-tab-add").click();
    await expect(tabs).toHaveCount(initialCount + 1);
    await expect(root).toHaveAttribute("data-mobile-pane", "editor");

    // Re-activating the first tab restores *its* remembered Schema pane …
    await tabs.first().click();
    await expect(root).toHaveAttribute("data-mobile-pane", "schema");

    // … and going back to the new tab restores its Editor pane.
    await tabs.last().click();
    await expect(root).toHaveAttribute("data-mobile-pane", "editor");
  });
});

test.describe("SQL playgrounds — desktop layout unchanged (1280×800)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("sqlite: 3-pane IDE, sidebar inline, no bottom tab bar", async ({
    page,
  }) => {
    await gotoPlayground(page, "sqlite");

    // All three panes visible side-by-side / stacked, sidebar inline.
    await expect(page.locator(".sql-sidebar")).toBeVisible();
    await expect(page.locator(".sql-editor-pane")).toBeVisible();
    await expect(page.locator(".sql-results-pane")).toBeVisible();
    // The mobile bottom tab bar must not show on desktop.
    await expect(page.locator(".sql-mobile-tabs")).toBeHidden();
    // The sidebar drag-resizer (a desktop-only affordance) is present.
    await expect(page.locator(".sql-sidebar-resizer")).toBeVisible();

    expect(await hasNoHorizontalOverflow(page)).toBe(true);
  });
});
