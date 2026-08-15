import { test, expect } from "@playwright/test";

/**
 * Regression: intermittent black borders on /learn. Tailwind v4's preflight
 * leaves the default border-color at currentColor; Fumadocs restores gray in
 * @layer base, but the App Router orders segment CSS non-deterministically on
 * soft navigation, so the preflight's `border: 0 solid` can land last and
 * reset borders to the near-black text color. The fix (app/docs.css) pins the
 * gray default in @layer components, which beats base regardless of chunk
 * order while still losing to border-color utilities. Rather than race chunk
 * order, the test recreates the bad cascade deterministically by appending the
 * preflight rule after load and asserts the default border stays gray.
 */

const PREFLIGHT_BORDER_RESET =
  "@layer base { *, ::after, ::before, ::backdrop, ::file-selector-button { border: 0 solid } }";

/** Injects a 1px-bordered probe with no explicit border-color, plus a reference
 *  element using the Fumadocs token, and returns their resolved colors. */
async function readBorderColors(evaluate: <T>(fn: () => T) => Promise<T>) {
  return evaluate(() => {
    const host = document.querySelector("#nd-page") ?? document.body;

    // Probe: width + style only — the `border` shorthand would set border-color
    // inline. Its color comes purely from the cascade.
    const el = document.createElement("div");
    el.style.borderStyle = "solid";
    el.style.borderWidth = "1px";
    host.appendChild(el);

    // Reference: same element with the Fumadocs token applied explicitly.
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
  await page.goto("/fumadocs-dev");
  await expect(page.locator("#nd-page")).toBeVisible();

  const c = await readBorderColors((fn) => page.evaluate(fn));

  // Sanity: the token must differ from the text color or the assertions below
  // are meaningless.
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
  await page.goto("/fumadocs-dev");
  await expect(page.locator("#nd-page")).toBeVisible();

  // Reproduce the soft-nav cascade: re-apply the preflight's `border: 0 solid`
  // into @layer base after the page's CSS.
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
