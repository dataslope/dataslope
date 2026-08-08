// Pins the geometry `scripts/trim-cutouts.mjs` derives from a cut-out's alpha
// channel, because every failure mode of that script is silent: the artwork is
// what ships, and a bound that is one row too tight clips a shadow (or a
// creature's ear) in a file that still looks like a perfectly good illustration
// in a directory listing. The two rules the script leans on — a faint halo is
// not content, and a stray speck is not content — are exactly the ones a
// synthetic image can state exactly.
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { trimPlan, verticalBounds } from "../scripts/trim-cutouts.mjs";

const WIDTH = 200;
const HEIGHT = 100;

interface Band {
  from: number;
  to: number;
  alpha: number;
  /** Number of pixels drawn in each row of the band (default: the full width). */
  pixels?: number;
}

/** A transparent PNG carrying the given horizontal bands of alpha. */
async function image(bands: Band[]): Promise<Buffer> {
  const raw = Buffer.alloc(WIDTH * HEIGHT * 4, 0);
  for (const band of bands) {
    for (let y = band.from; y <= band.to; y++) {
      for (let x = 0; x < (band.pixels ?? WIDTH); x++) {
        const i = (y * WIDTH + x) * 4;
        raw[i] = 20;
        raw[i + 1] = 30;
        raw[i + 2] = 40;
        raw[i + 3] = band.alpha;
      }
    }
  }
  return sharp(raw, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
    .png()
    .toBuffer();
}

describe("verticalBounds", () => {
  it("finds the first and last drawn row", async () => {
    const bounds = await verticalBounds(await image([{ from: 30, to: 69, alpha: 255 }]));
    expect(bounds).toMatchObject({ width: WIDTH, height: HEIGHT, top: 30, bottom: 69, empty: false });
  });

  it("ignores the near-transparent halo a background remover leaves", async () => {
    // A 10-alpha wash over the whole frame is what makes a naive bound return
    // the untrimmed image: every row has "content", so nothing is ever blank.
    const bounds = await verticalBounds(
      await image([
        { from: 0, to: HEIGHT - 1, alpha: 10 },
        { from: 40, to: 59, alpha: 255 },
      ]),
    );
    expect(bounds.top).toBe(40);
    expect(bounds.bottom).toBe(59);
  });

  it("ignores a stray speck of leftover background", async () => {
    // Three opaque pixels in row 5 are under the 0.2% row threshold (0.4 px of
    // 200 rounds to 1, so the guard is the count, not the rounding) — a real
    // subject fills far more of its row than a speck does.
    const bounds = await verticalBounds(
      await image([
        { from: 5, to: 5, alpha: 255, pixels: 3 },
        { from: 40, to: 59, alpha: 255 },
      ]),
      { rowFrac: 0.05 },
    );
    expect(bounds.top).toBe(40);
  });

  it("reports a fully transparent image as empty", async () => {
    const bounds = await verticalBounds(await image([]));
    expect(bounds.empty).toBe(true);
  });
});

describe("trimPlan", () => {
  it("keeps padding above and below the content", async () => {
    const bounds = await verticalBounds(await image([{ from: 30, to: 69, alpha: 255 }]));
    // 2% of 100 rows is 2px of padding on each side: rows 28..71 inclusive.
    expect(trimPlan(bounds)).toEqual({ top: 28, height: 44, removed: 1 - 44 / 100 });
  });

  it("clamps the padding at the edges of the frame", async () => {
    const bounds = await verticalBounds(await image([{ from: 0, to: 79, alpha: 255 }]));
    expect(trimPlan(bounds)).toMatchObject({ top: 0, height: 82 });
  });

  it("declines to trim an image that is already tight", async () => {
    // Re-running the script must not re-encode for a percent of nothing, which
    // is what keeps it idempotent rather than quietly lossy.
    const bounds = await verticalBounds(await image([{ from: 1, to: 98, alpha: 255 }]));
    expect(trimPlan(bounds)).toBeNull();
  });

  it("declines to trim a fully transparent image", async () => {
    const bounds = await verticalBounds(await image([]));
    expect(trimPlan(bounds)).toBeNull();
  });
});
