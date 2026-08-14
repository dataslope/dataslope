import { defineConfig, devices } from "@playwright/test";

// E2E tests run against the Next dev server, booted via `webServer` below and
// reused across local runs so an interactive `next dev` doesn't conflict.

const PORT = Number(process.env.E2E_PORT ?? 3457);

export default defineConfig({
  testDir: "./e2e",
  // Playground runtime initialization (clang/lld toolchain, Pyodide, WebR)
  // needs headroom on a cold cache.
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // The sandboxed runner trips on jsDelivr's certificate; real browsers
    // accept the same chain, so no coverage is lost.
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
