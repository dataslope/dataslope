import { defineConfig, devices } from "@playwright/test";

// E2E tests run against the Next.js dev server, which Playwright
// boots automatically via the `webServer` block below. The dev server
// is reused across local runs so an interactive `next dev` session
// doesn't conflict with `npm run test:e2e`.
//
// The `/c` route depends on cross-origin-isolated headers (set in
// `next.config.ts`) so the Wasmer SDK can use `SharedArrayBuffer`,
// and several playgrounds dynamically import scripts from CDNs at
// runtime — both work fine with the shipped Chromium.

const PORT = Number(process.env.E2E_PORT ?? 3457);

export default defineConfig({
  testDir: "./e2e",
  // Per-playground initialization (Wasmer fetching clang, Pyodide, WebR)
  // is the slow part — give each test enough headroom to finish even on
  // a cold cache.
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // The sandboxed test runner trips on jsDelivr's certificate via the
    // synthetic test environment. Real browsers in production accept
    // the same chain, so skipping here doesn't reduce real coverage.
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
