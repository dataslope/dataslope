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

// The `/illustration-prompts` gallery, the in-lesson `<IllustrationPrompt>`
// card, and the batch generator (scripts/generate-illustrations.mjs) all key
// off these pure helpers and the shared JSON, so their output is pinned here:
// the prompt text must match the authored GPT Image 2 template exactly (always
// "No text." plus the flat-circles rule), and the file name must be a stable
// PNG slug.

/** The constraints appended to every prompt regardless of subject. */
const CONSTRAINTS =
  "No text. Draw dots, markers, and nodes as flat 2D circles, never as glossy " +
  "3D spheres or balls.";

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

  it("still honours an explicitly authored risograph", () => {
    expect(
      buildIllustrationPrompt({ subject: "a ribbon of tiles", style: "risograph" }),
    ).toContain(`A risograph of a ribbon of tiles. ${CONSTRAINTS}`);
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

  // The rule exists because repeated round elements (scatter dots, chart
  // markers, tree nodes) kept coming back as glossy 3D balls. Every prompt
  // carries it, so no individual subject has to remember to say it.
  it("bans sphere-like dot groups on every prompt", () => {
    for (const entry of getIllustrationPrompts().entries) {
      expect(entry.prompt).toContain("flat 2D circles");
    }
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
