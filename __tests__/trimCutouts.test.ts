// Pins the geometry scripts/trim-cutouts.mjs derives from a cut-out's alpha
// channel — every failure mode is silent (a bound one row too tight clips a
// shadow in art that still looks fine). Also pins the margin policy:
// in-lesson figures keep left/right blank so lessons share an edge;
// thumbnails give it up because they paint ~100px wide.
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { contentBounds, trimAxesFor, trimPlan } from "../scripts/lib/cutouts.mjs";
import promptsData from "../data/illustration-prompts.json";

const WIDTH = 200;
const HEIGHT = 100;

interface Rect {
  /** Rows covered, inclusive. */
  from: number;
  to: number;
  alpha: number;
  /** Columns covered, inclusive (default: the full width). */
  x0?: number;
  x1?: number;
}

/** A transparent PNG carrying the given rectangles of alpha. */
async function image(rects: Rect[]): Promise<Buffer> {
  const raw = Buffer.alloc(WIDTH * HEIGHT * 4, 0);
  for (const rect of rects) {
    for (let y = rect.from; y <= rect.to; y++) {
      for (let x = rect.x0 ?? 0; x <= (rect.x1 ?? WIDTH - 1); x++) {
        const i = (y * WIDTH + x) * 4;
        raw[i] = 20;
        raw[i + 1] = 30;
        raw[i + 2] = 40;
        raw[i + 3] = rect.alpha;
      }
    }
  }
  return sharp(raw, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
    .png()
    .toBuffer();
}

describe("contentBounds", () => {
  it("finds the first and last drawn row", async () => {
    const bounds = await contentBounds(await image([{ from: 30, to: 69, alpha: 255 }]));
    expect(bounds).toMatchObject({ width: WIDTH, height: HEIGHT, top: 30, bottom: 69, empty: false });
  });

  it("finds the first and last drawn column", async () => {
    const bounds = await contentBounds(
      await image([{ from: 30, to: 69, alpha: 255, x0: 40, x1: 159 }]),
    );
    expect(bounds).toMatchObject({ top: 30, bottom: 69, left: 40, right: 159 });
  });

  it("ignores the near-transparent halo a background remover leaves", async () => {
    // A 10-alpha wash over the whole frame is what makes a naive bound return
    // the untrimmed image: every row has "content", so nothing is ever blank.
    const bounds = await contentBounds(
      await image([
        { from: 0, to: HEIGHT - 1, alpha: 10 },
        { from: 40, to: 59, alpha: 255, x0: 20, x1: 179 },
      ]),
    );
    expect(bounds).toMatchObject({ top: 40, bottom: 59, left: 20, right: 179 });
  });

  it("ignores a stray speck of leftover background", async () => {
    // Three opaque pixels in row 5 are under the 0.2% row threshold (0.4 px of
    // 200 rounds to 1, so the guard is the count, not the rounding) — a real
    // subject fills far more of its row than a speck does.
    const bounds = await contentBounds(
      await image([
        { from: 5, to: 5, alpha: 255, x0: 0, x1: 2 },
        { from: 40, to: 59, alpha: 255 },
      ]),
      { frac: 0.05 },
    );
    expect(bounds.top).toBe(40);
  });

  it("does not let a speck outside the content band widen the horizontal bound", async () => {
    // Columns are measured only within surviving rows, so a speck too small
    // to count vertically cannot pull `left` out to 0 either.
    const bounds = await contentBounds(
      await image([
        { from: 0, to: 8, alpha: 255, x0: 0, x1: 2 },
        { from: 40, to: 59, alpha: 255, x0: 80, x1: 119 },
      ]),
      { frac: 0.05 },
    );
    expect(bounds).toMatchObject({ top: 40, bottom: 59, left: 80, right: 119 });
  });

  it("reports a fully transparent image as empty", async () => {
    const bounds = await contentBounds(await image([]));
    expect(bounds.empty).toBe(true);
  });
});

describe("trimPlan", () => {
  it("keeps padding above and below the content", async () => {
    const bounds = await contentBounds(await image([{ from: 30, to: 69, alpha: 255 }]));
    // 2% of 100 rows is 2px of padding on each side: rows 28..71 inclusive.
    expect(trimPlan(bounds)).toEqual({
      left: 0,
      top: 28,
      width: WIDTH,
      height: 44,
      removed: 1 - 44 / 100,
    });
  });

  it("keeps the full width by default", async () => {
    // The in-lesson figure case: a figure that lost its side margins would be
    // a different width from the one in the next lesson.
    const bounds = await contentBounds(
      await image([{ from: 30, to: 69, alpha: 255, x0: 40, x1: 159 }]),
    );
    expect(trimPlan(bounds)).toMatchObject({ left: 0, width: WIDTH });
  });

  it("takes the side margins too under axes: both", async () => {
    const bounds = await contentBounds(
      await image([{ from: 30, to: 69, alpha: 255, x0: 40, x1: 159 }]),
    );
    // 2% of 200 columns is 4px each side: columns 36..163, rows 28..71.
    expect(trimPlan(bounds, { axes: "both" })).toEqual({
      left: 36,
      top: 28,
      width: 128,
      height: 44,
      removed: 1 - (128 * 44) / (WIDTH * HEIGHT),
    });
  });

  it("clamps the padding at the edges of the frame", async () => {
    const bounds = await contentBounds(await image([{ from: 0, to: 79, alpha: 255 }]));
    expect(trimPlan(bounds)).toMatchObject({ top: 0, height: 82 });
  });

  it("clamps the horizontal padding at the edges of the frame", async () => {
    const bounds = await contentBounds(
      await image([{ from: 30, to: 69, alpha: 255, x0: 2, x1: WIDTH - 1 }]),
    );
    expect(trimPlan(bounds, { axes: "both" })).toMatchObject({ left: 0, width: WIDTH });
  });

  it("declines to trim an image that is already tight", async () => {
    // Re-running the script must not re-encode for a percent of nothing, which
    // is what keeps it idempotent rather than quietly lossy.
    const bounds = await contentBounds(await image([{ from: 1, to: 98, alpha: 255 }]));
    expect(trimPlan(bounds)).toBeNull();
  });

  it("declines to trim a thumbnail that is already tight on both axes", async () => {
    const bounds = await contentBounds(
      await image([{ from: 1, to: 98, alpha: 255, x0: 2, x1: WIDTH - 3 }]),
    );
    expect(trimPlan(bounds, { axes: "both" })).toBeNull();
  });

  it("trims a frame that is blank only at the sides under axes: both", async () => {
    // Vertically tight, horizontally not: the case a height-only gain measure
    // would skip, and where every thumbnail lands after a vertical-only pass.
    const bounds = await contentBounds(
      await image([{ from: 1, to: 98, alpha: 255, x0: 40, x1: 159 }]),
    );
    expect(trimPlan(bounds)).toBeNull();
    expect(trimPlan(bounds, { axes: "both" })).toMatchObject({ left: 36, width: 128 });
  });

  it("declines to trim a fully transparent image", async () => {
    const bounds = await contentBounds(await image([]));
    expect(trimPlan(bounds)).toBeNull();
  });
});

describe("trimAxesFor", () => {
  it("trims a course thumbnail on both axes", () => {
    expect(trimAxesFor("python-basics-thumbnail")).toBe("both");
  });

  it("trims an interview-prep thumbnail on both axes", () => {
    expect(trimAxesFor("interview-data-analyst-thumbnail")).toBe("both");
  });

  it("keeps an in-lesson figure vertical-only", () => {
    expect(trimAxesFor("python-basics-loops")).toBe("vertical");
  });

  it("falls back to the naming convention for an id the corpus has never seen", () => {
    expect(trimAxesFor("some-future-course-thumbnail")).toBe("both");
    expect(trimAxesFor("some-future-course-lesson")).toBe("vertical");
  });

  it("agrees with the prompt corpus on every prompt", () => {
    // The fallback is only safe while the corpus names thumbnails
    // `<x>-thumbnail`; a convention-breaking prompt would trim fine (category
    // wins) but silently break the fallback, so the two are held together here.
    const disagreements = promptsData.prompts.filter(
      (p) => p.category.endsWith("-thumbnail") !== p.id.endsWith("-thumbnail"),
    );
    expect(disagreements.map((p) => p.id)).toEqual([]);
  });
});
