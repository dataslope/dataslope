import { test, expect } from "@playwright/test";

/**
 * Regression test for the "top of the page is cut off" glitch on the /learn
 * (and /interview) routes — the same intermittent, refresh-fixed family as the
 * black-border bug in `learn-border-color.spec.ts`, one cascade layer up.
 *
 * Background
 * ----------
 * Fumadocs's mobile navbar (`#nd-subnav`) carries two competing display
 * utilities: a base `flex` (`display:flex`) and a responsive `md:hidden`
 * (`display:none` at ≥48rem). Both are emitted into `@layer utilities`, so on
 * desktop the winner is decided purely by their source order within that layer.
 * On a normal load Tailwind orders the responsive `md:hidden` after the base
 * `flex`, so the navbar is hidden on desktop.
 *
 * The /learn route loads its Tailwind + Fumadocs CSS as a separate segment
 * chunk (`app/docs.css`, imported from the layout). The Next.js App
 * Router does not order segment CSS deterministically on a client-side
 * navigation into /learn; when the chunk lands such that base `flex` ends up
 * after `md:hidden`, `flex` wins and the mobile navbar paints on desktop. Its
 * height is `--fd-header-height`, which is 0px on desktop, so the logo + search +
 * sidebar-toggle overflow a zero-height sticky bar and the top of the page looks
 * sliced off — the "negative top margin" symptom — until a hard refresh restores
 * the server cascade.
 *
 * The fix (`app/docs.css`) re-asserts the desktop-hidden invariant in an
 * *unlayered* rule (`@media (min-width: 48rem) { #nd-subnav { display: none } }`).
 * Unlayered styles outrank every `@layer`, so this beats the base-`flex` utility
 * regardless of how the App Router orders the chunks — while leaving the navbar
 * visible below 48rem, where it is the only navigation. (The companion
 * root-cause mitigation is `experimental.cssChunking: 'strict'` in next.config.)
 *
 * What this test does
 * -------------------
 * Reproducing the non-deterministic chunk-order race by timing alone would be
 * flaky. Instead we reproduce the *cascade state* it produces, deterministically:
 * we append the base `flex` utility back into `@layer utilities` after the page
 * has loaded — the exact thing the reorder does — and assert the navbar stays
 * hidden on desktop. Without the fix the appended rule wins and the navbar shows
 * (cutting off the top); with it, the unlayered rule holds.
 */

const UTILITIES_FLEX_REORDER =
  "@layer utilities { .flex { display: flex } }";

test("learn route: the mobile navbar is hidden on desktop on a normal load", async ({
  page,
}) => {
  await page.goto("/fumadocs-dev");
  await expect(page.locator("#nd-page")).toBeVisible();

  // Desktop Chrome viewport (≥48rem): the mobile navbar must not be rendered.
  await expect(page.locator("#nd-subnav")).toBeHidden();
});

test("learn route: the mobile navbar stays hidden on desktop when the utilities layer is reordered (App Router soft-nav race)", async ({
  page,
}) => {
  await page.goto("/fumadocs-dev");
  await expect(page.locator("#nd-page")).toBeVisible();

  // Reproduce the soft-navigation cascade: re-apply the base `flex` utility into
  // @layer utilities *after* the page's CSS. Without the fix this flips the
  // navbar's desktop display from `none` back to `flex` (the cut-off-top bug);
  // with the fix (desktop-hidden pinned in an unlayered rule) it cannot.
  await page.evaluate((css) => {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }, UTILITIES_FLEX_REORDER);

  const display = await page
    .locator("#nd-subnav")
    .evaluate((el) => getComputedStyle(el).display);

  expect(
    display,
    "after the utilities-layer reorder, the mobile navbar must NOT become visible on desktop",
  ).toBe("none");
});

test("learn route: the mobile navbar is still shown below 48rem (fix does not over-reach)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 420, height: 860 });
  await page.goto("/fumadocs-dev");
  await expect(page.locator("#nd-page")).toBeVisible();

  // On mobile the navbar is the only navigation — the desktop-hide rule is
  // scoped to ≥48rem, so it must remain visible here, even under the reorder.
  await page.evaluate((css) => {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }, UTILITIES_FLEX_REORDER);

  await expect(page.locator("#nd-subnav")).toBeVisible();
});
