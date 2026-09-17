import { test, expect, type Page } from "@playwright/test";

/**
 * The `/courses` sidebar is sticky, so a language or level can be clicked from
 * any scroll depth, and a click almost always makes the list shorter. Picking
 * "CSS" from the bottom of 32 courses used to leave the reader on blank page
 * below a list that had ended far above the viewport. The catalog now scrolls
 * the top of the results back under the sticky header, smoothly. See
 * app/courses/_components/catalogScroll.ts.
 */

/** Viewport-relative top of the course-list column, the sidebar's neighbour. */
const listTop = (page: Page) =>
  page.evaluate(() => {
    const grid = document.querySelector("aside")!.parentElement!;
    return Math.round((grid.children[1] as HTMLElement).getBoundingClientRect().top);
  });

/** window.scrollY once per frame for `ms`, to tell a glide from a jump. */
const scrollPath = (page: Page, ms: number) =>
  page.evaluate(async (duration) => {
    const seen: number[] = [];
    const until = performance.now() + duration;
    await new Promise<void>((done) => {
      const tick = () => {
        seen.push(Math.round(window.scrollY));
        if (performance.now() < until) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    });
    return [...new Set(seen)];
  }, ms);

const toBottom = async (page: Page) => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
};

// The sidebar's own `md:top-[68px]`: where the list header should come to rest.
const SIDEBAR_TOP = 68;

test("a language click glides the filtered list back under the header", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/courses");
  await toBottom(page);
  expect(await listTop(page)).toBeLessThan(0);

  const path = scrollPath(page, 1500);
  await page.getByRole("button", { name: /^CSS/ }).click();
  const positions = await path;

  expect(await listTop(page)).toBe(SIDEBAR_TOP);
  // Animated rather than teleported. The browser's own clamp onto the shorter
  // document is one of these steps; the rest are the smooth scroll.
  expect(positions.length).toBeGreaterThan(5);
  await expect(page.locator("a[href^='/courses/']").first()).toBeInViewport();
});

test("a level click behaves the same way", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/courses");
  await toBottom(page);

  await page.getByRole("button", { name: /^advanced/i }).click();
  await page.waitForTimeout(1200);
  expect(await listTop(page)).toBe(SIDEBAR_TOP);
});

// Scrolling a reader who can already see what they clicked would be the rude
// kind of scrolling, so the correction only ever runs upwards.
test("a click near the top of the page moves nothing", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/courses");
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: /^Python/ }).click();
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(0);
});

// On mobile the sidebar is replaced by a filter bar stuck below the header,
// and the list has to come to rest below the bar rather than behind it.
test("on mobile the list clears the sticky filter bar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto("/courses");
  await toBottom(page);

  await page.getByLabel("Filter by language").selectOption("css");
  await page.waitForTimeout(1200);

  const barBottom = await page
    .locator("div.sticky.top-11")
    .evaluate((el) => Math.round(el.getBoundingClientRect().bottom));
  expect(await listTop(page)).toBeGreaterThanOrEqual(barBottom);
  await expect(page.locator("a[href^='/courses/']").first()).toBeInViewport();
});

test("prefers-reduced-motion gets the same landing without the glide", async ({
  browser,
}) => {
  const page = await browser.newPage({
    reducedMotion: "reduce",
    viewport: { width: 1280, height: 800 },
  });
  await page.goto("/courses");
  await toBottom(page);

  const path = scrollPath(page, 900);
  await page.getByRole("button", { name: /^CSS/ }).click();
  const positions = await path;

  expect(await listTop(page)).toBe(SIDEBAR_TOP);
  // The clamp onto the shorter document, then the jump. No in-between frames.
  expect(positions.length).toBeLessThanOrEqual(3);
  await page.close();
});
