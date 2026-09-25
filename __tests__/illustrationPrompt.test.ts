import { describe, expect, it } from "vitest";
import { BRAND_COLORS, buildIllustrationPrompt } from "../lib/illustrationPrompt";
import { getIllustrationPrompts } from "../lib/illustrationPromptsGallery";

// The admin gallery and scripts/generate-illustrations.mjs both build prompts
// from these helpers, so the rules the model depends on are pinned here.

/** The constraints every style shares. */
const SHARED =
  "No text. Draw only the objects described — nothing scattered over, around, " +
  "or behind them: no speckled dots, no confetti, no stray connecting lines.";

describe("buildIllustrationPrompt", () => {
  // Risograph keeps the two shared rules but swaps the isometric
  // volume/staging/animal block: asking for both gives a 3D render with grain.
  it("gives risograph its own constraints, keeping the shared two", () => {
    const prompt = buildIllustrationPrompt({
      subject: "a ribbon of tiles",
      style: "risograph",
    });
    expect(prompt).toContain(`A risograph of a ribbon of tiles. ${SHARED}`);
    expect(prompt).toContain("Print it as a risograph");
    expect(prompt).not.toContain("solid three-dimensional form");
    expect(prompt).not.toContain("pale grey and white");
  });

  // Load-bearing: blank paper gives the background remover a subject to lift;
  // brand inks keep a cut-out visible on both themes (black-keyed art vanishes
  // on the near-black page); the band shape is the 2:1 generation frame.
  it("keeps the risograph rules that make a cut-out survive both themes", () => {
    const prompt = buildIllustrationPrompt({ subject: "a rocket", style: "risograph" });
    expect(prompt).toContain("Leave the paper blank white");
    expect(prompt).toContain("no printed panel, no frame, no border, no ground shadow");
    expect(prompt).toContain("never key the scene off black, grey, or a single hue");
    expect(prompt).toContain("twice as long as it is tall");
  });

  // Both rules ride every prompt: earlier wording that named decorations
  // ("dots, markers, and nodes", "flat 2D circles") made the model draw them.
  it("bans scattered decoration and keeps forms solid on every prompt", () => {
    for (const entry of getIllustrationPrompts().entries) {
      expect(entry.prompt).toContain("no speckled dots, no confetti");
      // Risograph bands are flat spot-ink prints and skip the solid-form rule.
      if (entry.style === "risograph") continue;
      expect(entry.prompt).toContain("solid three-dimensional form");
      expect(entry.prompt).toContain("never as a glossy sphere, a ball");
      // Must stay prohibitive: prescribing a replacement shape ("low solid
      // discs") made the model draw every scene as rows of colored coins.
      expect(entry.prompt).not.toMatch(/low solid disc/i);
      expect(entry.prompt).not.toMatch(/draw any repeated round elements/i);
    }
  });

  // Risograph exists for the inline bands and nothing else.
  it("keeps risograph to the inline category, and everything else isometric", () => {
    for (const entry of getIllustrationPrompts().entries) {
      if (entry.category === "course-inline") {
        expect(entry.style).toBe("risograph");
      } else {
        expect(entry.style).toBe("isometric illustration");
      }
    }
  });

  // Regression: "flat 2D circles" named a decorative element to draw, and
  // every prompt inherited it.
  it("never asks for flat 2D shapes in the shared constraints", () => {
    const prompt = buildIllustrationPrompt({ subject: "a chest of drawers" });
    expect(prompt).not.toContain("flat 2D");
    expect(prompt).not.toMatch(/Draw dots, markers, and nodes/);
  });
});

describe("getIllustrationPrompts", () => {
  const data = getIllustrationPrompts();

  it("builds one entry per JSON prompt with unique ids", () => {
    expect(data.entries.length).toBe(data.totalIllustrations);
    expect(data.entries.length).toBeGreaterThan(0);
    const ids = data.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// The .mjs generator cannot import the TS helper and carries its own copy of
// the prompt template — the copy that reaches the API — so pin the two together.
describe("generator / library prompt parity", () => {
  it("builds byte-identical prompts for every authored prompt", async () => {
    const { buildPrompt } = await import("../scripts/generate-illustrations.mjs");
    const data = getIllustrationPrompts();
    expect(data.entries.length).toBeGreaterThan(0);
    for (const entry of data.entries) {
      expect(buildPrompt({ subject: entry.subject, style: entry.style }, BRAND_COLORS)).toBe(
        buildIllustrationPrompt({ subject: entry.subject, style: entry.style }, BRAND_COLORS),
      );
    }
  });

  it("agrees on the default style and article handling", async () => {
    const { buildPrompt } = await import("../scripts/generate-illustrations.mjs");
    for (const style of [undefined, "risograph", "isometric illustration", "cut-paper collage"]) {
      expect(buildPrompt({ subject: "a marmot", style }, BRAND_COLORS)).toBe(
        buildIllustrationPrompt({ subject: "a marmot", style }, BRAND_COLORS),
      );
    }
  });
});

describe("authored subjects", () => {
  // A subject that asks for numbers contradicts the "No text" rule and wins:
  // "a numbered shelf" came back stamped with digits. Describe position
  // physically instead (a hand reaching past three slots to the fourth).
  it("never asks an illustration for numbers it is told not to draw", () => {
    // A gauge that "reads a single number" is deliberately not caught — it
    // renders as a dial, correctly. Common trap: authors write "numbered-free
    // X" meaning unmarked, which guarantees digits; write "unmarked"/"blank".
    const asksForDigits =
      /\bnumbered\b|\b(?:column|grid|row|stack|strip|list|table) of numbers\b|\bnumber tiles?\b/i;
    const offenders = getIllustrationPrompts()
      .entries.filter((e) => asksForDigits.test(e.subject))
      .map((e) => e.id);
    expect(offenders).toEqual([]);
  });

  // "Whiskers" fails outright: the model draws cat whiskers. Write "a thin rod
  // projecting from its top and its bottom" instead.
  it("never names a box plot's whiskers", () => {
    const offenders = getIllustrationPrompts()
      .entries.filter((e) => /\bwhiskers?\b/i.test(e.subject))
      .map((e) => e.id);
    expect(offenders).toEqual([]);
  });
});

// Traps not guarded by regex (too many correct uses), recorded for the next
// author:
//   * A verb giving an object intent ("refusing", "wearing") can draw a cartoon
//     face; describe the mechanism instead ("the gate staying latched").
//   * A word with a physical twin gets the twin: "columns" can render as
//     classical pillars, "combed" as hair combs, "mask" as a carnival mask.
//   * Naming a thing the style block bans deletes it: "a frame stretched wider"
//     drew only the frame's contents. Ask for a board, card, or tile.
