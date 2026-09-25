import path from "node:path";
import { defineConfig } from "vitest/config";

/** Runs every challenge's reference solution and starter through python3 and
 *  node subprocesses: ~65 s, most of the suite's time, for a result that only
 *  `lib/challenges/**` and the two challenge harnesses can change. So it runs
 *  from `npm run test:challenges` (vitest.challenges.config.ts) and its own
 *  path-gated workflow, .github/workflows/challenge-solutions.yml, rather than
 *  on every `npm test`. */
export const CHALLENGE_SOLUTIONS = "__tests__/challengeSolutions.test.ts";

export default defineConfig({
  resolve: {
    // Mirror tsconfig's `@/*` → repo root, so tests can import modules that
    // themselves use the alias (e.g. lib/auth/server.ts).
    alias: { "@": path.resolve(import.meta.dirname) },
  },
  test: {
    // Tests using browser APIs are tagged "browser" and skipped in Node.
    environment: "node",
    // The published .NET WebAssembly bundle is loaded as-is by
    // `csharpBuild.test.ts`. Running it through the transform pipeline
    // buys nothing and makes it hunt for a source map the bundle does not
    // ship, which it then complains about on every run.
    server: { deps: { external: [/[\\/]cdn-assets[\\/]/] } },
    // e2e/ belongs to Playwright (`npm run test:e2e`). `**/node_modules/**`
    // also matches nested ones (e.g. cloudflare-cors-proxy/node_modules) so
    // third-party package tests are never collected.
    exclude: ["**/node_modules/**", "dist/**", ".next/**", "e2e/**", CHALLENGE_SOLUTIONS],
  },
});
