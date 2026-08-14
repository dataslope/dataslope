import { test, expect } from "@playwright/test";

/**
 * Regression: "top of the page is cut off" on /learn — same soft-nav CSS
 * chunk-order family as learn-border-color.spec.ts. #nd-subnav carries both
 * `flex` and `md:hidden` in @layer utilities; when the App Router reorders
 * segment CSS so `flex` lands last, the mobile navbar paints on desktop inside
 * a zero-height sticky bar and slices off the page top. The fix (app/docs.css)
 * hides it via an unlayered ≥48rem rule, which outranks every @layer
 * regardless of chunk order while leaving the navbar visible below 48rem.
 * The test recreates the bad cascade deterministically by appending the base
 * `flex` utility after load and asserts the navbar stays hidden on desktop.
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

  // Reproduce the soft-nav cascade: re-apply the base `flex` utility into
  // @layer utilities after the page's CSS.
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

  // On mobile the navbar is the only navigation; it must stay visible even
  // under the reorder.
  await page.evaluate((css) => {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }, UTILITIES_FLEX_REORDER);

  await expect(page.locator("#nd-subnav")).toBeVisible();
});
