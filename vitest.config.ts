import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests that use browser APIs (WebAssembly, WebWorker, SharedArrayBuffer)
    // are tagged as "browser" and skipped in the Node environment.
    // Run the full test suite with:  npm test
    environment: "node",
  },
});
