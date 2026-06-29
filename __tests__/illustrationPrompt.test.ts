import { describe, expect, it } from "vitest";
import {
  buildIllustrationPrompt,
  illustrationFileName,
  illustrationFileSlug,
} from "../lib/illustrationPrompt";

// The `/illustration-prompts` gallery, the on-page placeholder anchor, and the
// eventual SVG asset all key off these pure helpers, so their output is pinned
// here: the prompt text must match the authored template exactly, and the file
// slug must be stable and collision-free for distinct subjects.

describe("buildIllustrationPrompt", () => {
  it("appends '(photo attached)' for people and omits it otherwise", () => {
    expect(buildIllustrationPrompt("Brendan Eich", true)).toBe(
      "Create a line art-styled illustration of Brendan Eich (photo attached). " +
        "Use Recraft Vector V4.1. Use a transparent background. " +
        "The illustration should work well in both light (#ffffff) and dark backgrounds (#121212).",
    );
    expect(buildIllustrationPrompt("a Gentoo penguin standing on Antarctic ice", false)).toBe(
      "Create a line art-styled illustration of a Gentoo penguin standing on Antarctic ice. " +
        "Use Recraft Vector V4.1. Use a transparent background. " +
        "The illustration should work well in both light (#ffffff) and dark backgrounds (#121212).",
    );
  });
});

describe("illustrationFileSlug", () => {
  it("turns a person into a '<name>-portrait' slug", () => {
    expect(illustrationFileSlug("Leland Wilkinson", true)).toBe(
      "leland-wilkinson-portrait",
    );
  });

  it("strips diacritics and a trailing descriptor after a comma/colon", () => {
    expect(illustrationFileSlug("Karen Spärck Jones", true)).toBe(
      "karen-sparck-jones-portrait",
    );
    expect(
      illustrationFileSlug("Fred Brooks, author of The Mythical Man-Month", true),
    ).toBe("fred-brooks-portrait");
    expect(
      illustrationFileSlug(
        "the Gang of Four: Erich Gamma, Richard Helm, Ralph Johnson, and John Vlissides",
        true,
      ),
    ).toBe("gang-of-four-portrait");
  });

  it("maps the two Dahl & Nygaard phrasings to one shared portrait", () => {
    expect(illustrationFileSlug("Ole-Johan Dahl and Kristen Nygaard", true)).toBe(
      illustrationFileSlug(
        "Ole-Johan Dahl and Kristen Nygaard, the creators of Simula",
        true,
      ),
    );
  });

  it("uses curated slugs for objects, unifying the two Datasaurus phrasings", () => {
    expect(
      illustrationFileSlug(
        "a duck (the DuckDB mascot) perched on a stack of database disks",
        false,
      ),
    ).toBe("duckdb-duck-mascot");
    expect(
      illustrationFileSlug("the Datasaurus dinosaur-shaped scatter plot", false),
    ).toBe("datasaurus");
    expect(
      illustrationFileSlug(
        "a scatter of points forming a cartoon dinosaur (the Datasaurus)",
        false,
      ),
    ).toBe("datasaurus");
  });

  it("exposes the full file name with extension", () => {
    expect(illustrationFileName("Florence Nightingale", true)).toBe(
      "florence-nightingale-portrait.svg",
    );
  });
});
