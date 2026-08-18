import { test, expect, type Page } from "@playwright/test";

// E2E coverage for every playground route: wait for the runtime, run the
// default example, assert the expected output. Catches pages that render but
// silently fail to execute. CDN runtime downloads make the timeouts generous.

async function waitForRuntimeReady(page: Page) {
  // Run is disabled until adapter.init() resolves; if init throws, the
  // loading banner shows the error — surface that instead of timing out.
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
  // Wait for a run that finished: the elapsed time ("Done in N.NNs") only
  // renders once it has.
  await page.waitForFunction(
    () => {
      const runs = document.querySelectorAll(".run-cell");
      return (
        runs.length > 0 &&
        [...runs].every((c) =>
          c.querySelector(".run-cell-ms")?.textContent?.startsWith("Done in"),
        )
      );
    },
    null,
    { timeout: 150_000 },
  );
  // One entry per segment of the newest run, in the order they appear.
  return page.evaluate(() => {
    const runs = [...document.querySelectorAll(".run-cell")];
    const last = runs[runs.length - 1];
    if (!last) return [];
    return [...last.querySelectorAll(".run-cell-content > *")].map((c) => ({
      type: c.getAttribute("data-cell-type") ?? "unknown",
      body: c.textContent ?? "",
    }));
  });
}

test.describe("Playgrounds (fast)", () => {
  test("JavaScript runs the default example", async ({ page }) => {
    // Regression guard: Turbopack splits the worker bundle into chunks; a
    // classic Worker loads them via importScripts() and throws "Identifier
    // 'e1' has already been declared". Fix is type: "module" on the Worker.
    const initErrors: string[] = [];
    page.on("pageerror", (err) => initErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") initErrors.push(msg.text());
    });

    await page.goto("/playground/javascript");
    await waitForRuntimeReady(page);

    expect(
      initErrors.find((m) => m.includes("importScripts")),
      `expected no importScripts error during worker init, got:\n${initErrors.join("\n")}`,
    ).toBeUndefined();

    const cells = await runAndCollectOutput(page);
    const stdout = cells.find((c) => c.type === "stdout");
    expect(stdout, "expected a stdout cell").toBeTruthy();
    expect(stdout!.body.length).toBeGreaterThan(0);
    expect(cells.find((c) => c.type === "stderr")).toBeUndefined();
  });

  test("TypeScript runs the default example", async ({ page }) => {
    const initErrors: string[] = [];
    page.on("pageerror", (err) => initErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") initErrors.push(msg.text());
    });

    await page.goto("/playground/typescript");
    await waitForRuntimeReady(page);

    expect(
      initErrors.find((m) => m.includes("importScripts")),
      `expected no importScripts error during worker init, got:\n${initErrors.join("\n")}`,
    ).toBeUndefined();
    const cells = await runAndCollectOutput(page);
    const stdout = cells.find((c) => c.type === "stdout");
    expect(stdout, "expected a stdout cell").toBeTruthy();
    expect(stdout!.body.length).toBeGreaterThan(0);
    expect(cells.find((c) => c.type === "stderr")).toBeUndefined();
  });

  test("Web (HTML/CSS/JS) renders the live page preview", async ({ page }) => {
    await page.goto("/playground/web");
    await waitForRuntimeReady(page);

    // The web playground opens CodePen-style: one always-visible pane
    // per file of the default HTML/CSS/JS trio.
    await expect(page.locator(".split-editor-section")).toHaveCount(3, {
      timeout: 30_000,
    });

    // The Files rail/pane is hidden for the web playground, the panes
    // themselves are the file surface.
    await expect(page.locator(".playground-icon-sidebar")).toHaveCount(0);
    await expect(
      page.locator('button[aria-label="Files"]'),
    ).toHaveCount(0);

    await page.locator(".run-btn").first().click();

    // The default trio renders inside the sandboxed preview iframe,
    // the CSS and JS panes apply implicitly (no <link>/<script src>).
    const preview = page.frameLocator(".web-preview-slot iframe");
    await expect(preview.locator("h1")).toContainText(
      "Hello, Web Playground!",
      { timeout: 60_000 },
    );

    // script.js wired a click handler, the preview stays interactive.
    await preview.locator("#greet").click();
    await expect(preview.locator("#greet")).toContainText("Clicked 1 time");

    // Its console.log crosses the postMessage bridge into the console
    // pane, which the web playground renders in place of output cells.
    await expect(page.locator(".web-console-content")).toContainText(
      "Scripts run too",
      { timeout: 30_000 },
    );
  });

  test("React compiles TSX in-browser and renders an interactive preview", async ({
    page,
  }) => {
    await page.goto("/playground/react");
    // First readiness wait covers the esbuild-wasm toolchain download.
    await waitForRuntimeReady(page);

    // React opens as the main/App/styles trio in the tabbed editor with the
    // Files rail, unlike web's split panes.
    await expect(page.locator(".playground-tab")).toHaveCount(3, {
      timeout: 30_000,
    });
    await expect(page.locator(".split-editor-section")).toHaveCount(0);
    await expect(page.locator(".playground-icon-sidebar")).toHaveCount(1);

    await page.locator(".run-btn").first().click();

    const preview = page.frameLocator(".web-preview-slot iframe");
    await expect(preview.locator("h1")).toContainText("You clicked 0 times", {
      timeout: 120_000,
    });

    // The preview stays live after the run, clicking drives real
    // React state updates inside the sandboxed document.
    await preview.locator("button").click();
    await expect(preview.locator("h1")).toContainText("You clicked 1 times");
  });

  test("PHP runs the default example", async ({ page }) => {
    await page.goto("/playground/php");
    await waitForRuntimeReady(page);
    const cells = await runAndCollectOutput(page);
    const stdout = cells.find((c) => c.type === "stdout");
    expect(stdout, "expected a stdout cell").toBeTruthy();
    expect(stdout!.body.length).toBeGreaterThan(0);
    expect(cells.find((c) => c.type === "stderr")).toBeUndefined();
  });

  test("C compiles and runs the default example", async ({ page }) => {
    await page.goto("/playground/c");
    await waitForRuntimeReady(page);
    const cells = await runAndCollectOutput(page);
    // Anything but the greeting (a clang error, a WASI crash) means the
    // browsercc toolchain failed to initialize.
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
    await page.goto("/playground/cpp");
    await waitForRuntimeReady(page);
    const cells = await runAndCollectOutput(page);
    const stdout = cells.find((c) => c.type === "stdout");
    expect(stdout, "expected a stdout cell").toBeTruthy();
    expect(stdout!.body).toContain("Hello, C++ Playground!");
    const stderr = cells.find((c) => c.type === "stderr");
    expect(
      stderr,
      `unexpected stderr: ${stderr?.body ?? ""}`,
    ).toBeUndefined();
  });

  test("Java compiles and runs the default example", async ({ page }) => {
    await page.goto("/playground/java");
    await waitForRuntimeReady(page);
    const cells = await runAndCollectOutput(page);
    // CheerpJ may emit -Xlint warnings on stderr; only stdout is asserted.
    const stdout = cells.find((c) => c.type === "stdout");
    expect(stdout, "expected a stdout cell").toBeTruthy();
    expect(stdout!.body).toContain("Hello, Java Playground!");
  });

  test("C# compiles and runs the default example", async ({ page }) => {
    await page.goto("/playground/csharp");
    await waitForRuntimeReady(page);
    const cells = await runAndCollectOutput(page);
    const stdout = cells.find((c) => c.type === "stdout");
    expect(stdout, "expected a stdout cell").toBeTruthy();
    expect(stdout!.body).toContain("Hello, C# Playground!");
  });
});

test.describe("Packages button visibility", () => {
  test("PHP playground hides the Packages button (no installable packages)", async ({
    page,
  }) => {
    await page.goto("/playground/php");
    await waitForRuntimeReady(page);
    // Desktop button: rendered only when packages.length > 0.
    await expect(page.getByRole("button", { name: "Packages" })).toHaveCount(0);

    // The mobile Packages action lives in the menu drawer, which only exists
    // at the mobile breakpoint (≤768px); shrink the viewport to reach it.
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
    await page.goto("/playground/javascript");
    await waitForRuntimeReady(page);
    await expect(page.getByRole("button", { name: "Packages" })).toHaveCount(0);
  });

  test("TypeScript playground hides the Packages button (transpile-only)", async ({
    page,
  }) => {
    await page.goto("/playground/typescript");
    await waitForRuntimeReady(page);
    await expect(page.getByRole("button", { name: "Packages" })).toHaveCount(0);
  });

  test("C playground shows the Packages button (stdlib headers)", async ({
    page,
  }) => {
    await page.goto("/playground/c");
    await waitForRuntimeReady(page);
    await expect(
      page.getByRole("button", { name: "Packages" }).first(),
    ).toBeVisible();
  });

  test("C++ playground shows the Packages button (stdlib headers)", async ({
    page,
  }) => {
    await page.goto("/playground/cpp");
    await waitForRuntimeReady(page);
    await expect(
      page.getByRole("button", { name: "Packages" }).first(),
    ).toBeVisible();
  });

  test("Java playground shows the Packages button (JDK packages)", async ({
    page,
  }) => {
    await page.goto("/playground/java");
    await waitForRuntimeReady(page);
    await expect(
      page.getByRole("button", { name: "Packages" }).first(),
    ).toBeVisible();
  });

  test("C# playground shows the Packages button (BCL namespaces)", async ({
    page,
  }) => {
    await page.goto("/playground/csharp");
    await waitForRuntimeReady(page);
    await expect(
      page.getByRole("button", { name: "Packages" }).first(),
    ).toBeVisible();
  });
});
