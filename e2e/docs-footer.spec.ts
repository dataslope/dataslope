import { test, expect } from "@playwright/test";

/**
 * Shared site footer on Fumadocs routes. The footer must be a SIBLING of
 * DocsLayout, below #nd-docs-layout (see DocsFooter.tsx): the sticky
 * one-viewport sidebar spans the whole grid, so it unpins exactly when the
 * grid's bottom edge — the top of the footer — reaches the viewport bottom.
 * Moving the footer inside DocsLayout keeps the sidebar pinned over it and
 * lays the footer into the grid columns; that is the regression caught here.
 */

const DOCS_PAGE = "/fumadocs-dev";

test("docs routes render the shared footer, with the Tabbied band, below the docs layout", async ({
  page,
}) => {
  await page.goto(DOCS_PAGE);
  await expect(page.locator("#nd-page")).toBeVisible();

  const footer = page.locator("footer");
  await expect(footer).toHaveCount(1);

  // Below the Fumadocs grid, not inside it. Both halves matter: inside, the
  // sticky sidebar would cover it (see the scroll test below).
  const placement = await footer.evaluate((el) => ({
    afterLayout: el.previousElementSibling?.id ?? null,
    insideLayout: !!el.closest("#nd-docs-layout"),
  }));
  expect(placement).toEqual({
    afterLayout: "nd-docs-layout",
    insideLayout: false,
  });

  // The decorative Tabbied band at the top of the footer (`FooterPattern`
  // renders it into a canvas/SVG) and the four link columns.
  await expect(footer.locator("canvas, svg").first()).toBeAttached();
  await expect(
    footer.getByRole("heading", { name: "Playgrounds" }),
  ).toBeVisible();

  // The columns come from the `.ds-footer-grid` rule in app/footer.css, which
  // app/docs.css imports; without it the grid collapses to a single column.
  const columns = await footer
    .locator(".ds-footer-grid")
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(4);
});

test("docs routes: the sidebar stays pinned through the page, then releases into the footer", async ({
  page,
}) => {
  await page.goto(DOCS_PAGE);
  await expect(page.locator("#nd-page")).toBeVisible();

  const probe = () =>
    page.evaluate(() => {
      const sidebar = document.getElementById("nd-sidebar")!;
      const layout = document.getElementById("nd-docs-layout")!;
      const footer = document.querySelector("footer")!;
      return {
        sidebarTop: Math.round(sidebar.getBoundingClientRect().top),
        sidebarBottom: Math.round(sidebar.getBoundingClientRect().bottom),
        layoutBottom: Math.round(layout.getBoundingClientRect().bottom),
        footerTop: Math.round(footer.getBoundingClientRect().top),
        // The scroll offset at which the docs grid's bottom edge reaches the
        // bottom of the viewport, i.e. where the sidebar is due to let go.
        releaseAt: Math.round(
          layout.getBoundingClientRect().height - window.innerHeight,
        ),
        maxScroll: document.documentElement.scrollHeight - window.innerHeight,
      };
    });

  const { maxScroll, releaseAt, footerTop } = await probe();
  // The footer is genuinely below the fold, and the docs content is taller
  // than the viewport, otherwise the assertions below would pass for the
  // wrong reason.
  expect(footerTop).toBeGreaterThan(0);
  expect(releaseAt).toBeGreaterThan(200);

  // Deep into the docs content, but before the grid runs out: still pinned.
  await page.evaluate((y) => window.scrollTo(0, y), releaseAt - 100);
  await page.waitForTimeout(150);
  const middle = await probe();
  expect(middle.sidebarTop, "sidebar must stay pinned while the page scrolls").toBe(0);
  expect(middle.footerTop).toBeGreaterThan(0);

  // At the bottom of the page it has released: it scrolled up with the docs
  // grid instead of hanging over the footer.
  await page.evaluate((y) => window.scrollTo(0, y), maxScroll);
  await page.waitForTimeout(150);
  const bottom = await probe();
  expect(bottom.sidebarTop, "sidebar must unpin once the docs content ends").toBeLessThan(0);
  // It comes to rest flush with the end of the docs grid, i.e. the top of the
  // footer, rather than overlapping it.
  expect(Math.abs(bottom.sidebarBottom - bottom.layoutBottom)).toBeLessThanOrEqual(1);
  expect(bottom.sidebarBottom).toBeLessThanOrEqual(bottom.footerTop);
});
