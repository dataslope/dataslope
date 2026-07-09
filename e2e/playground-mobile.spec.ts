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

      // Results is gated until a query produces output: the bottom-bar Results
      // tab stays disabled so the user can never land on an empty Results pane.
      // A brand-new query tab has no output regardless of whether the WASM
      // engine has booted, which keeps this deterministic and CDN-independent
      // (the engine is intentionally not awaited in this spec).
      await page.locator(".playground-tab-add").click();
      await expect(root).toHaveAttribute("data-mobile-pane", "editor");
      await expect(resultsTab).toBeDisabled();

      // Still no overflow after switching panes / adding a tab.
      expect(await hasNoHorizontalOverflow(page)).toBe(true);
    });
  }

  // ── Request 3: per-query-tab bottom-pane memory ──────────────────────
  // Activating a query tab restores *that tab's* remembered bottom pane (a
  // brand-new tab defaults to Editor), and the restore never strands the user
  // on the disabled, empty Results pane. The full Editor↔Results memory needs a
  // booted engine to produce results (so a tab can legitimately remember
  // Results) and is exhaustively covered by the `paneForActivatedTab` unit
  // test. Here we exercise the DOM wiring engine-free: tab creation, activation,
  // and the data-tab-id / .active observer that drives the per-tab restore.
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

    // Switching between query tabs runs the per-tab restore (the observer reads
    // each tab's data-tab-id + .active). With no tab holding results, every
    // activation lands on the Editor, and never on the disabled Results pane.
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
