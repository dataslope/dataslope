import { test, expect } from "@playwright/test";

// The shared playground boot overlay (Update: diamond "assemble + quarter
// turn" loader + status line + progress bar) should appear on every
// playground's loading screen. The overlay is transient (it unmounts on
// load), so these assert its structure while it's up and capture a
// screenshot for visual review.

test("language playground boot overlay: diamond + status + progress bar", async ({
  page,
}) => {
  await page.goto("/playground/python");
  const overlay = page.locator(".playground-boot-overlay");
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  // The brand diamond loader renders an SVG.
  await expect(overlay.locator(".playground-boot-loader svg").first()).toBeVisible();
  await expect(overlay.locator(".playground-boot-title")).not.toBeEmpty();
  // The progress bar appears once a boot fraction is reported.
  await expect(overlay.locator(".playground-boot-bar")).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: "test-results/boot-python.png" });
});

test("SQL playground boot overlay: diamond + status + progress bar", async ({
  page,
}) => {
  await page.goto("/playground/duckdb");
  const overlay = page.locator(".playground-boot-overlay");
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await expect(overlay.locator(".playground-boot-loader svg").first()).toBeVisible();
  // SQL drives a creeping bar, so it's present immediately.
  await expect(overlay.locator(".playground-boot-bar")).toBeVisible();
  await page.screenshot({ path: "test-results/boot-duckdb.png" });
});
