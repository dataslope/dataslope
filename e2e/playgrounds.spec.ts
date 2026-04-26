import { test, expect, type Page } from "@playwright/test";

// E2E coverage for every playground route. Each test loads the route,
// waits for the runtime to finish initializing (Run becomes enabled),
// presses Run on the default Hello World example, and asserts that the
// expected output snippet shows up in the output pane. This is what
// catches regressions where the page renders but execution silently
// fails.
//
// The browsercc-, Pyodide- and WebR-backed playgrounds fetch real
// runtimes from a CDN on first load, so the per-test timeouts in
// `playwright.config.ts` are intentionally generous.

async function waitForRuntimeReady(page: Page) {
  // The Run button is disabled until `setLoaded(true)` fires, which
  // only happens after `adapter.init()` resolves successfully. If
  // initialization throws, the loading banner shows the error message
  // — surface that instead of waiting out the timeout.
  await page.waitForFunction(
    () => {
      const banner = document.querySelector(".loading-banner, .pg-status");
      const text = banner?.textContent ?? "";
      if (text.startsWith("Failed to load")) {
        throw new Error(text);
      }
      const btn = document.querySelector(".run-btn");
      return !!btn && !btn.hasAttribute("disabled");
    },
    null,
    { timeout: 150_000 },
  );
}

async function runAndCollectOutput(page: Page) {
  await page.locator(".run-btn").first().click();
  // Wait for at least one output cell that finished — the elapsed
  // timestamp ("Done in N.NNs") only renders after the run completes.
  await page.waitForFunction(
    () => {
      const cells = document.querySelectorAll(".out-cell");
      return cells.length > 0 &&
        Array.from(cells).every((c) =>
          c.querySelector(".cell-time")?.textContent?.startsWith("Done in"),
        );
    },
    null,
    { timeout: 150_000 },
  );
  const cells = await page.locator(".out-cell").all();
  const collected: { type: string; body: string }[] = [];
  for (const cell of cells) {
    const cls = (await cell.getAttribute("class")) ?? "";
    const type = cls
      .split(/\s+/)
      .find((c) => ["stdout", "stderr", "html", "image", "plot"].includes(c)) ??
      "unknown";
    const body = (await cell.locator(".out-cell-body").textContent()) ?? "";
    collected.push({ type, body });
  }
  return collected;
}

test.describe("Playgrounds (fast)", () => {
  test("JavaScript runs the default example", async ({ page }) => {
    await page.goto("/javascript");
    await waitForRuntimeReady(page);
    const cells = await runAndCollectOutput(page);
    const stdout = cells.find((c) => c.type === "stdout");
    expect(stdout, "expected a stdout cell").toBeTruthy();
    expect(stdout!.body.length).toBeGreaterThan(0);
    expect(cells.find((c) => c.type === "stderr")).toBeUndefined();
  });

  test("TypeScript runs the default example", async ({ page }) => {
    await page.goto("/typescript");
    await waitForRuntimeReady(page);
    const cells = await runAndCollectOutput(page);
    const stdout = cells.find((c) => c.type === "stdout");
    expect(stdout, "expected a stdout cell").toBeTruthy();
    expect(stdout!.body.length).toBeGreaterThan(0);
    expect(cells.find((c) => c.type === "stderr")).toBeUndefined();
  });

  test("PHP runs the default example", async ({ page }) => {
    await page.goto("/php");
    await waitForRuntimeReady(page);
    const cells = await runAndCollectOutput(page);
    const stdout = cells.find((c) => c.type === "stdout");
    expect(stdout, "expected a stdout cell").toBeTruthy();
    expect(stdout!.body.length).toBeGreaterThan(0);
    expect(cells.find((c) => c.type === "stderr")).toBeUndefined();
  });

  test("C compiles and runs the default example", async ({ page }) => {
    await page.goto("/c");
    await waitForRuntimeReady(page);
    const cells = await runAndCollectOutput(page);
    // The default Hello World example prints "Hello, C Playground!".
    // Anything else (in particular a clang error or runtime crash)
    // means the browsercc toolchain or WASI shim failed to initialize
    // — exactly the regression this test exists to catch.
    const stdout = cells.find((c) => c.type === "stdout");
    expect(stdout, "expected a stdout cell").toBeTruthy();
    expect(stdout!.body).toContain("Hello, C Playground!");
    const stderr = cells.find((c) => c.type === "stderr");
    expect(
      stderr,
      `unexpected stderr: ${stderr?.body ?? ""}`,
    ).toBeUndefined();
  });

  test("C++ compiles and runs the default example", async ({ page }) => {
    await page.goto("/cpp");
    await waitForRuntimeReady(page);
    const cells = await runAndCollectOutput(page);
    // The default Hello World example prints "Hello, C++ Playground!".
    const stdout = cells.find((c) => c.type === "stdout");
    expect(stdout, "expected a stdout cell").toBeTruthy();
    expect(stdout!.body).toContain("Hello, C++ Playground!");
    const stderr = cells.find((c) => c.type === "stderr");
    expect(
      stderr,
      `unexpected stderr: ${stderr?.body ?? ""}`,
    ).toBeUndefined();
  });
});

test.describe("Packages button visibility", () => {
  test("PHP playground hides the Packages button (no installable packages)", async ({
    page,
  }) => {
    await page.goto("/php");
    await waitForRuntimeReady(page);
    // Desktop button: rendered only when packages.length > 0.
    await expect(page.getByRole("button", { name: "Packages" })).toHaveCount(0);

    // Mobile button lives inside the menu drawer, which only exists in
    // the layout at the mobile breakpoint (≤768px in `playground.css`).
    // Shrink the viewport so the hamburger becomes visible, then open
    // it and verify the Packages action is omitted.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".mobile-menu-btn").click();
    await expect(
      page.locator(".mobile-menu-drawer-body").getByText("Packages", {
        exact: true,
      }),
    ).toHaveCount(0);
  });

  test("JavaScript playground hides the Packages button (native runtime)", async ({
    page,
  }) => {
    await page.goto("/javascript");
    await waitForRuntimeReady(page);
    await expect(page.getByRole("button", { name: "Packages" })).toHaveCount(0);
  });

  test("TypeScript playground hides the Packages button (transpile-only)", async ({
    page,
  }) => {
    await page.goto("/typescript");
    await waitForRuntimeReady(page);
    await expect(page.getByRole("button", { name: "Packages" })).toHaveCount(0);
  });

  test("C playground shows the Packages button (stdlib headers)", async ({
    page,
  }) => {
    await page.goto("/c");
    await waitForRuntimeReady(page);
    await expect(
      page.getByRole("button", { name: "Packages" }).first(),
    ).toBeVisible();
  });

  test("C++ playground shows the Packages button (stdlib headers)", async ({
    page,
  }) => {
    await page.goto("/cpp");
    await waitForRuntimeReady(page);
    await expect(
      page.getByRole("button", { name: "Packages" }).first(),
    ).toBeVisible();
  });
});
