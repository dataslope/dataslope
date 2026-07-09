// Opt-in Playwright config for sandboxed remote environments (e.g. Claude
// Code on the web), where the pinned @playwright/test expects a browser
// build that isn't installed but the container ships a compatible Chromium
// at /opt/pw-browsers/chromium. Never picked up automatically, run with:
//
//   npx playwright test --config playwright.local.config.ts …
//
// Local development and CI keep using playwright.config.ts unchanged.
import baseConfig from "./playwright.config";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  ...baseConfig,
  use: {
    ...baseConfig.use,
    launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
  },
});
