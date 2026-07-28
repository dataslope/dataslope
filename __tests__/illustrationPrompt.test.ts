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
// "No text."), and the file name must be a stable PNG slug.

describe("buildIllustrationPrompt", () => {
  it("formats a risograph prompt with the four brand colors and No text.", () => {
    expect(
      buildIllustrationPrompt({ subject: "a logistics center full of packages" }),
    ).toBe(
      "A risograph of a logistics center full of packages. No text.\n\n" +
        "Blue: #148cff\n" +
        "Green: #20c621\n" +
        "Red: #ff4f59\n" +
        "Yellow: #ffdd6c",
    );
  });

  it("uses 'An' for a vowel-initial style and honours custom styles/colors", () => {
    expect(
      buildIllustrationPrompt(
        { subject: "a marmot on a track", style: "isometric illustration" },
        { blue: "#000", green: "#111", red: "#222", yellow: "#333" },
      ),
    ).toBe(
      "An isometric illustration of a marmot on a track. No text.\n\n" +
        "Blue: #000\nGreen: #111\nRed: #222\nYellow: #333",
    );
    expect(
      buildIllustrationPrompt({ subject: "a duck", style: "line art illustration" }),
    ).toContain("A line art illustration of a duck. No text.");
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
    expect(thumb?.prompt).toContain("A risograph of");
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
