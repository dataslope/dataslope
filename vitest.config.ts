import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror tsconfig's `@/*` → repo root, so tests can import modules that
    // themselves use the alias (e.g. lib/auth/server.ts).
    alias: { "@": path.resolve(import.meta.dirname) },
  },
  test: {
    // Tests that use browser APIs (WebAssembly, WebWorker, SharedArrayBuffer)
    // are tagged as "browser" and skipped in the Node environment.
    // Run the full test suite with:  npm test
    environment: "node",
    // E2E tests live in `e2e/` and are run by Playwright
    // (`npm run test:e2e`). Keep Vitest from picking them up so that
    // `npm test` stays a fast Node-only check.
    // Match nested node_modules too (e.g. cloudflare-cors-proxy/node_modules)
    // so we never pick up third-party package tests when the worker's deps
    // are installed locally.
    exclude: ["**/node_modules/**", "dist/**", ".next/**", "e2e/**"],
  },
});
