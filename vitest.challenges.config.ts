import { defineConfig } from "vitest/config";
import base, { CHALLENGE_SOLUTIONS } from "./vitest.config";

// `npm run test:challenges`: only the challenge-solution sweep that the
// default config leaves out (see CHALLENGE_SOLUTIONS there).
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: [CHALLENGE_SOLUTIONS],
    exclude: ["**/node_modules/**"],
  },
});
