import { describe, expect, it } from "vitest";
import {
  BRAND_COLORS,
  buildIllustrationPrompt,
  illustrationFileName,
  illustrationFileSlug,
} from "../lib/illustrationPrompt";
import {
  getIllustrationPrompts,
  getIllustrationPromptById,
} from "../lib/illustrationPromptsGallery";

// The admin gallery, the in-lesson <IllustrationPrompt> card, and
// scripts/generate-illustrations.mjs all key off these helpers, so the exact
// prompt text and file-name slugs are pinned here.

/** The constraints appended to every isometric prompt, which is every prompt
 *  except the `course-inline` risograph bands. */
const CONSTRAINTS =
  "No text. Draw only the objects described — nothing scattered over, around, " +
  "or behind them: no speckled dots, no confetti, no stray connecting lines. " +
  "Render each object as a solid three-dimensional form with real thickness, " +
  "smooth matte shading, and clean edges; never as a glossy sphere, a ball, or " +
  "a thin round counter. " +
  "Stage everything light and airy on an empty transparent background: pale " +
  "grey and white platforms, bright brand colors, no dark or black bases. " +
  "Leave the background fully empty behind, around and beneath the subject: " +
  "no backdrop, no floor, no ground shadow, no soft glow and no vignette, so " +
  "the whole subject lifts off the page in one piece. Make every object a " +
  "single solid piece in one flat brand color: never build one object out of " +
  "many small blocks or cubelets, never pack a container with a heap of little " +
  "pieces, and never blend, mix, or bleed two colors into each other. Animals " +
  "are the exception and the focal point: draw each one as a rounded, " +
  "realistic creature with soft fur or feather texture and its own natural " +
  "coloring and markings, never a flat brand color and never a flat " +
  "silhouette. A bird has wings, a beak and feet and never hands or arms: it " +
  "perches, stands, or nudges things with its beak rather than holding them.";

/** The part of it that is shared with every other style. */
const SHARED =
  "No text. Draw only the objects described — nothing scattered over, around, " +
  "or behind them: no speckled dots, no confetti, no stray connecting lines.";

describe("buildIllustrationPrompt", () => {
  it("defaults to the isometric house style, with brand colors and the constraints", () => {
    expect(
      buildIllustrationPrompt({ subject: "a logistics center full of packages" }),
    ).toBe(
      `An isometric illustration of a logistics center full of packages. ${CONSTRAINTS}\n\n` +
        "Blue: #148cff\n" +
        "Green: #20c621\n" +
        "Red: #ff4f59\n" +
        "Yellow: #ffdd6c",
    );
  });

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

  it("falls back to the isometric constraints for a style with no block", () => {
    expect(
      buildIllustrationPrompt({ subject: "a duck", style: "cut-paper collage" }),
    ).toContain(`A cut-paper collage of a duck. ${CONSTRAINTS}`);
  });

  it("uses 'An' for a vowel-initial style and honours custom styles/colors", () => {
    expect(
      buildIllustrationPrompt(
        { subject: "a marmot on a track", style: "isometric illustration" },
        { blue: "#000", green: "#111", red: "#222", yellow: "#333" },
      ),
    ).toBe(
      `An isometric illustration of a marmot on a track. ${CONSTRAINTS}\n\n` +
        "Blue: #000\nGreen: #111\nRed: #222\nYellow: #333",
    );
    expect(
      buildIllustrationPrompt({ subject: "a duck", style: "line art illustration" }),
    ).toContain(`A line art illustration of a duck. ${CONSTRAINTS}`);
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

  it("exposes the canonical brand palette", () => {
    expect(BRAND_COLORS).toEqual({
      blue: "#148cff",
      green: "#20c621",
      red: "#ff4f59",
      yellow: "#ffdd6c",
    });
  });
});

describe("illustration file names", () => {
  it("normalises an id to a slug and a .png file name", () => {
    expect(illustrationFileSlug("Python Basics Thumbnail")).toBe(
      "python-basics-thumbnail",
    );
    expect(illustrationFileName("python-basics-hello-world")).toBe(
      "python-basics-hello-world.png",
    );
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

  it("carries a style and mascot flag on every entry", () => {
    for (const e of data.entries) {
      expect(e.style.length).toBeGreaterThan(0);
      expect(typeof e.mascot).toBe("boolean");
      expect(e.prompt).toContain("No text.");
    }
  });

  it("collapses an index lesson to the course landing route", () => {
    const thumb = getIllustrationPromptById("python-basics-thumbnail");
    expect(thumb).toBeDefined();
    expect(thumb?.route).toBe("/courses/python-basics");
    expect(thumb?.file).toBe("python-basics-thumbnail.png");
    expect(thumb?.prompt).toContain("An isometric illustration of");
  });

  it("deep-links a lesson-embedded illustration and reflects its style", () => {
    const loops = getIllustrationPromptById("python-basics-loops");
    expect(loops?.href).toBe(
      "/courses/python-basics/loops#python-basics-loops",
    );
    expect(loops?.mascot).toBe(true);
    expect(loops?.prompt).toContain("An isometric illustration of");
    expect(loops?.prompt).toContain("Blue: #148cff");
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
