import { test, expect, type Page } from "@playwright/test";

// Mobile layout coverage for the three SQL playgrounds: below 768px the
// 3-pane IDE collapses to a single surface switched by a bottom tab bar,
// driven by data-mobile-pane on .playground-root. Deliberately does NOT wait
// for the WASM engine: layout and tab switching are pure shell state + CSS,
// keeping the test fast and CDN-independent (the boot overlay is hidden).

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

test.describe("SQL playgrounds, mobile layout (390×844)", () => {
  test.use({ viewport: MOBILE, hasTouch: true, isMobile: true });

  for (const engine of ENGINES) {
    test(`${engine}: single-pane shell, no overflow, panes reachable`, async ({
      page,
    }) => {
      await gotoPlayground(page, engine);

      const root = page.locator(".playground-root");
      const sidebar = page.locator(".sql-sidebar");
      const editor = page.locator(".sql-editor-pane");
      const tabBar = page.locator(".sql-mobile-tabs");
      const resultsTab = tabBar.getByRole("tab", { name: "Results" });

      // No horizontal page overflow, the core "unusable on mobile" bug.
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

      // Back to the Editor.
      await tabBar.getByRole("tab", { name: "Editor" }).click();
      await expect(root).toHaveAttribute("data-mobile-pane", "editor");
      await expect(editor).toBeVisible();
      await expect(sidebar).toBeHidden();

      // Results stays disabled until a query produces output; a brand-new tab
      // has none regardless of engine boot, keeping this deterministic.
      await page.locator(".playground-tab-add").click();
      await expect(root).toHaveAttribute("data-mobile-pane", "editor");
      await expect(resultsTab).toBeDisabled();

      // Still no overflow after switching panes / adding a tab.
      expect(await hasNoHorizontalOverflow(page)).toBe(true);
    });
  }

  // The drawer menu's database selector used to give the page a few pixels of
  // horizontal scroll: Base UI anchors the dropdown with `left: 0` + a
  // `translate(x, y)`, so an unconstrained popup shrink-to-fits to the full
  // viewport width and the translate pushes it off the right edge — dragging
  // the whole page, sheet included, sideways. It is now capped to the space
  // Base UI publishes on the positioner and scrolls internally instead.
  for (const engine of ENGINES) {
    test(`${engine}: drawer database dropdown fits the viewport`, async ({
      page,
    }) => {
      await gotoPlayground(page, engine);

      await page.locator(".mobile-menu-btn").click();
      const menu = page.locator(".mobile-menu-drawer[aria-label='Menu']");
      await expect(menu).toBeVisible();

      // The page can't scroll behind the open sheet: the playground body
      // keeps `overflow: hidden` and the backdrop swallows touch gestures.
      const guards = await page.evaluate(() => ({
        body: getComputedStyle(document.body).overflow,
        backdrop: getComputedStyle(
          document.querySelector(".mobile-menu-backdrop")!,
        ).touchAction,
        drawerBody: getComputedStyle(
          document.querySelector(".mobile-menu-drawer-body")!,
        ).overscrollBehavior,
      }));
      expect(guards).toEqual({
        body: "hidden",
        backdrop: "none",
        drawerBody: "contain",
      });

      await menu.locator(".sql-database-selector").click();
      const popup = page.locator(".sql-db-popup");
      await expect(popup).toBeVisible();

      // Neither axis of the document overflows, and the dropdown itself
      // stays inside the viewport.
      expect(await hasNoHorizontalOverflow(page)).toBe(true);
      const fits = await page.evaluate(() => {
        const de = document.documentElement;
        const r = document
          .querySelector(".sql-db-popup")!
          .getBoundingClientRect();
        return {
          verticalOverflow: de.scrollHeight > de.clientHeight,
          outsideViewport:
            r.left < 0 ||
            r.top < 0 ||
            r.right > de.clientWidth ||
            r.bottom > de.clientHeight,
        };
      });
      expect(fits).toEqual({ verticalOverflow: false, outsideViewport: false });
    });
  }

  // Activating a query tab restores that tab's remembered bottom pane, never
  // stranding the user on the disabled Results pane. Full Editor↔Results
  // memory needs a booted engine and is covered by the paneForActivatedTab
  // unit test; here the DOM wiring is exercised engine-free.
  test("sqlite: activating a query tab restores a reachable pane (never empty Results)", async ({
    page,
  }) => {
    await gotoPlayground(page, "sqlite");
    const root = page.locator(".playground-root");
    const tabBar = page.locator(".sql-mobile-tabs");
    const tabs = page.locator(".playground-tab");
    const resultsTab = tabBar.getByRole("tab", { name: "Results" });

    // Start from the Editor (the query-tab strip is visible there) and note
    // the current tab count.
    await tabBar.getByRole("tab", { name: "Editor" }).click();
    await expect(root).toHaveAttribute("data-mobile-pane", "editor");
    const initialCount = await tabs.count();

    // A brand-new query tab ("+") becomes active and defaults to the Editor;
    // with no output yet, its Results tab is gated (disabled).
    await page.locator(".playground-tab-add").click();
    await expect(tabs).toHaveCount(initialCount + 1);
    await expect(root).toHaveAttribute("data-mobile-pane", "editor");
    await expect(resultsTab).toBeDisabled();

    // With no tab holding results, every activation lands on the Editor,
    // never on the disabled Results pane.
    await tabs.first().click();
    await expect(root).toHaveAttribute("data-mobile-pane", "editor");
    await tabs.last().click();
    await expect(root).toHaveAttribute("data-mobile-pane", "editor");
  });
});

test.describe("SQL playgrounds, desktop layout unchanged (1280×800)", () => {
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
