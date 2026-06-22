import { test, expect } from "@playwright/test";

/**
 * Regression test for the Tailwind v4 `currentColor` border-color default on
 * the /learn route ("intermittent black borders, fixed by refresh").
 *
 * Background
 * ----------
 * The /learn route loads Tailwind v4 via `app/learn/learn.css`, imported from
 * `app/learn/layout.tsx` and therefore scoped to the /learn segment's CSS
 * chunk. Tailwind v4 dropped v3's gray border default: its preflight emits
 * `*, ::before, ::after { border: 0 solid }`, leaving the default border *color*
 * at `currentColor` (the near-black text color). Fumadocs restores a gray
 * default in its own `@layer base` rule (`* { border-color: var(--color-fd-border) }`),
 * which wins on a normal load because it is imported after Tailwind.
 *
 * Both rules live in `@layer base`, so their winner is decided by source order.
 * The Next.js App Router does not order segment CSS deterministically on a
 * client-side navigation into /learn; when the preflight rule ends up applied
 * after Fumadocs's, its `border: 0 solid` shorthand resets border-color back to
 * `currentColor` and every border relying on the default paints black — until a
 * hard refresh restores the server cascade. (Verified empirically: appending a
 * late `@layer base { * { border: 0 solid } }` to a loaded /learn page flips the
 * universal border default from gray to the black text color.)
 *
 * The fix (`app/learn/learn.css`) pins the gray default one layer up, in
 * `@layer components`. Layer precedence (components > base) is independent of
 * stylesheet/chunk order, so it always beats the base-layer preflight regardless
 * of how the App Router orders the chunks, while still losing to border-color
 * *utilities* in `@layer utilities` (so intentional colored borders are kept).
 *
 * What this test does
 * -------------------
 * Reproducing the non-deterministic chunk-order race by timing alone would be
 * flaky. Instead we reproduce the *cascade state* it produces, deterministically:
 * we append the preflight's universal `border: 0 solid` rule back into
 * `@layer base` after the page has loaded — the exact thing the reorder does —
 * and assert that a width-only border (one that relies on the default color)
 * still resolves to the Fumadocs gray token rather than the black text color.
 * Without the fix the appended rule wins and the border goes black; with it, the
 * components-layer default holds and the border stays gray.
 */

const PREFLIGHT_BORDER_RESET =
  "@layer base { *, ::after, ::before, ::backdrop, ::file-selector-button { border: 0 solid } }";

/** Injects a 1px-bordered probe with no explicit border-color, plus a reference
 *  element using the Fumadocs token, and returns their resolved colors. */
async function readBorderColors(evaluate: <T>(fn: () => T) => Promise<T>) {
  return evaluate(() => {
    const host = document.querySelector("#nd-page") ?? document.body;

    // Probe: border width + style only (never the `border` shorthand, which
    // would itself set border-color inline). Its color comes purely from the
    // cascade — the base-layer preflight default or the components-layer fix.
    const el = document.createElement("div");
    el.style.borderStyle = "solid";
    el.style.borderWidth = "1px";
    host.appendChild(el);

    // Reference: same element with the Fumadocs border token applied explicitly,
    // to capture its resolved rgb() value in this exact context.
    const ref = document.createElement("div");
    ref.style.borderStyle = "solid";
    ref.style.borderWidth = "1px";
    ref.style.borderColor = "var(--color-fd-border)";
    host.appendChild(ref);

    const result = {
      borderColor: getComputedStyle(el).borderTopColor,
      textColor: getComputedStyle(el).color, // what `currentColor` resolves to
      tokenColor: getComputedStyle(ref).borderTopColor, // resolved --color-fd-border
    };
    el.remove();
    ref.remove();
    return result;
  });
}

test("learn route: default border color is the Fumadocs gray token on a normal load", async ({
  page,
}) => {
  await page.goto("/learn");
  await expect(page.locator("#nd-page")).toBeVisible();

  const c = await readBorderColors((fn) => page.evaluate(fn));

  // Sanity: the token must be a real color distinct from the text color, or the
  // assertions below would be meaningless.
  expect(
    c.tokenColor,
    "--color-fd-border should resolve to a real color distinct from the text color",
  ).not.toBe(c.textColor);

  expect(c.borderColor, "default border should be the Fumadocs gray token").toBe(
    c.tokenColor,
  );
  expect(c.borderColor).not.toBe(c.textColor);
});

test("learn route: default border stays gray when the base-layer preflight is reordered last (App Router soft-nav race)", async ({
  page,
}) => {
  await page.goto("/learn");
  await expect(page.locator("#nd-page")).toBeVisible();

  // Reproduce the soft-navigation cascade: re-apply the preflight's universal
  // `border: 0 solid` into @layer base *after* the page's CSS. Without the fix
  // this resets the default border color to currentColor (black); with the fix
  // (default pinned in @layer components) it cannot.
  await page.evaluate((css) => {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }, PREFLIGHT_BORDER_RESET);

  const c = await readBorderColors((fn) => page.evaluate(fn));

  expect(
    c.borderColor,
    "after the base-layer preflight reorder, the default border must NOT fall back to the black currentColor",
  ).not.toBe(c.textColor);
  expect(c.borderColor, "default border should still be the Fumadocs gray token").toBe(
    c.tokenColor,
  );
});
