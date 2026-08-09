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

// The `/dashboard/admin/illustration-prompts` gallery, the in-lesson `<IllustrationPrompt>`
// card, and the batch generator (scripts/generate-illustrations.mjs) all key
// off these pure helpers and the shared JSON, so their output is pinned here:
// the prompt text must match the authored GPT Image 2 template exactly (always
// "No text." plus the no-clutter rule, then the constraints of the style being
// drawn), and the file name must be a stable PNG slug.

/** The constraints appended to every isometric prompt, which is every prompt
 *  except the `course-inline` risograph bands. */
const CONSTRAINTS =
  "No text. Draw only the objects described — nothing scattered over, around, " +
  "or behind them: no speckled dots, no confetti, no stray connecting lines. " +
  "Render each object as a solid three-dimensional form with real thickness, " +
  "smooth matte shading, and clean edges; never as a glossy sphere, a ball, or " +
  "a thin round counter. " +
  "Stage everything light and airy on a white background: pale grey and white " +
  "platforms, bright brand colors, no dark or black bases. Make every object a " +
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

  // Risograph is the one style with constraints of its own: the inline
  // historical bands. It keeps the two shared rules and swaps everything the
  // isometric block says about volume, staging and animals, because asking one
  // prompt for both gives a 3D render with grain sprinkled over it.
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

  // Every one of these is load-bearing, not stylistic. Blank paper is what
  // leaves the background remover a subject to lift rather than a rectangle;
  // brand inks are the transparency constraint (a black-keyed cut-out reads on
  // the white page and vanishes on the near-black one); the band shape is the
  // 2:1 frame these are generated at.
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

  // Two rules, both on every prompt so no individual subject has to remember
  // them. The clutter ban is there because the previous wording named "dots,
  // markers, and nodes" in all 879 prompts and the model drew them into
  // subjects that had none; the solid-form rule is there because the same
  // sentence asked for "flat 2D circles" and flattened the isometric style it
  // was supposed to be decorating.
  it("bans scattered decoration and keeps forms solid on every prompt", () => {
    for (const entry of getIllustrationPrompts().entries) {
      expect(entry.prompt).toContain("no speckled dots, no confetti");
      // The solid-form half is the isometric block's, and the risograph bands
      // deliberately do not carry it: they are flat spot-ink prints.
      if (entry.style === "risograph") continue;
      expect(entry.prompt).toContain("solid three-dimensional form");
      expect(entry.prompt).toContain("never as a glossy sphere, a ball");
      // The glossy-sphere ban must stay PROHIBITIVE. Naming a replacement
      // shape ("draw round elements as low solid discs") is a positive
      // instruction, and the model obeyed it everywhere — scenes came back as
      // rows of coloured coins. Same failure as the old "draw dots as flat 2D
      // circles" line. Never prescribe a shape the subject did not ask for.
      expect(entry.prompt).not.toMatch(/low solid disc/i);
      expect(entry.prompt).not.toMatch(/draw any repeated round elements/i);
    }
  });

  // The two styles in use, and the categories that may carry them. A lesson's
  // own art is isometric; risograph exists for the inline bands and nothing
  // else, which is what keeps "do not reintroduce a second style" true.
  it("keeps risograph to the inline category, and everything else isometric", () => {
    for (const entry of getIllustrationPrompts().entries) {
      if (entry.category === "course-inline") {
        expect(entry.style).toBe("risograph");
      } else {
        expect(entry.style).toBe("isometric illustration");
      }
    }
  });

  // Regression: the constraint block must not name a decorative element as
  // something to draw. "flat 2D circles" did, and every prompt inherited it.
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

// The batch generator is a plain .mjs script and cannot import the TypeScript
// helper, so it carries its own copy of the prompt template. That copy is the
// one that actually reaches the API, so pin the two together here: if the house
// style changes in lib/illustrationPrompt.ts but not in the script (or vice
// versa), the gallery would advertise a prompt the generator never sends.
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
  // Every style block ends with "No text, letters, numbers or symbols anywhere
  // in the image", and the model honours it — until the subject itself asks for
  // the opposite. "A long numbered shelf" produced a shelf stamped 0, 2, 3, 4,
  // 5, 6 (skipping 1, for good measure), and "one a numbered rail" produced
  // drawers stamped 1 to 4. Both read as a "No text" failure by the model; both
  // were written into the prompt by hand.
  //
  // Position is drawable without writing a single digit: a hand reaching past
  // the first three slots to the fourth says index just as clearly. This keeps
  // the two instructions from contradicting each other in the first place.
  it("never asks an illustration for numbers it is told not to draw", () => {
    // Three spellings, all of which produced literal digits: "a numbered
    // shelf", "a column of numbers", "number tiles". A gauge that "reads a
    // single number" is deliberately not caught — that one comes back as a
    // dial with a pointer, which is exactly right, and banning the word
    // outright would flag six subjects that are already correct.
    const asksForDigits =
      /\bnumbered\b|\b(?:column|grid|row|stack|strip|list|table) of numbers\b|\bnumber tiles?\b/i;
    const offenders = getIllustrationPrompts()
      .entries.filter((e) => asksForDigits.test(e.subject))
      .map((e) => e.id);
    expect(offenders).toEqual([]);
  });
});
