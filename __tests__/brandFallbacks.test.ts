import { describe, it, expect } from "vitest";
import BRAND_FALLBACKS from "../lib/generated/brand-fallbacks.js";

/**
 * Contract test for the generated brand-token fallback map.
 *
 * app/brand.css is the single source of truth for the `--ds-*` color ramps;
 * `scripts/build-brand-fallbacks.mjs` parses it at build time into
 * `lib/generated/brand-fallbacks.js`, which the Mermaid brand theming
 * (app/_components/mdx/mermaid.tsx) uses as literal fallbacks when a CSS
 * variable can't be read from the DOM.
 *
 * The generator guarantees the values can't drift from brand.css, but it
 * can't know which tokens Mermaid depends on — deleting a ramp step from
 * brand.css (say, the blue half-steps the mindmap shades use) would silently
 * produce `undefined` colors at render time. This test pins that contract:
 * every token mermaid.tsx references must exist, as a concrete hex color.
 */

// Tokens mermaid.tsx references: the mindmap blue shades (MINDMAP_ROOT /
// MINDMAP_BRANCHES), the categorical wheel's 500 fills and 600 strokes
// (WHEEL / snapToBrand / adaptNodes), the neutral grays used for page-level
// structure per theme, and the yellow note fill.
const MERMAID_TOKENS = [
  ...["300", "400", "500", "550", "600", "650", "700", "750", "800", "850", "900", "950"].map(
    (step) => `--ds-blue-${step}`,
  ),
  ...["teal", "green", "yellow", "orange", "red", "purple"].flatMap((hue) => [
    `--ds-${hue}-500`,
    `--ds-${hue}-600`,
  ]),
  ...["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"].map(
    (step) => `--ds-gray-${step}`,
  ),
  "--ds-white",
];

describe("generated brand fallbacks (lib/generated/brand-fallbacks.js)", () => {
  it("contains every token the Mermaid brand theme references", () => {
    const missing = MERMAID_TOKENS.filter((token) => !(token in BRAND_FALLBACKS));
    expect(missing).toEqual([]);
  });

  it("holds only concrete hex colors (Mermaid runs color math on them)", () => {
    for (const [token, value] of Object.entries(BRAND_FALLBACKS)) {
      expect(value, token).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });
});
