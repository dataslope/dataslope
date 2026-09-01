// Pins the alpha check that replaced the background-removal step. Generation
// now asks gpt-image-2 for `background: "transparent"`, so the generated file
// IS the cut-out every page serves — and the two ways that goes wrong are
// silent. A fully opaque frame gets promoted as a `-cutout` and serves a white
// rectangle; a frame carrying a partial-alpha ground shadow looks perfect on
// the light theme and shows a grey smudge on the dark one. Neither is visible
// in a file listing, so `alphaStats` is what the generator reads before it
// writes anything.
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { alphaStats } from "../scripts/generate-illustrations.mjs";

const WIDTH = 120;
const HEIGHT = 80;

/** A PNG whose rows carry the given alpha values, in order, over the full
 *  width. Colors are irrelevant here; only the alpha channel is read. */
async function image(bands: { rows: number; alpha: number }[]): Promise<Buffer> {
  const raw = Buffer.alloc(WIDTH * HEIGHT * 4, 0);
  let y = 0;
  for (const band of bands) {
    for (let n = 0; n < band.rows && y < HEIGHT; n++, y++) {
      for (let x = 0; x < WIDTH; x++) {
        const i = (y * WIDTH + x) * 4;
        raw[i] = 20;
        raw[i + 1] = 140;
        raw[i + 2] = 255;
        raw[i + 3] = band.alpha;
      }
    }
  }
  return sharp(raw, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
    .png()
    .toBuffer();
}

describe("alphaStats", () => {
  it("reports a healthy cut-out as mostly clear and solid", async () => {
    // Half transparent, most of the rest opaque, a thin antialiased edge.
    const stats = await alphaStats(
      await image([
        { rows: 40, alpha: 0 },
        { rows: 2, alpha: 128 },
        { rows: 38, alpha: 255 },
      ]),
    );
    expect(stats.clear).toBeCloseTo(0.5, 1);
    expect(stats.solid).toBeCloseTo(0.475, 1);
    expect(stats.soft).toBeLessThan(0.05);
  });

  it("reports no clear pixels at all for an opaque frame", async () => {
    // The failure the generator refuses to write: the model painted a
    // background despite being asked for none.
    const stats = await alphaStats(await image([{ rows: HEIGHT, alpha: 255 }]));
    expect(stats.clear).toBe(0);
    expect(stats.solid).toBe(1);
  });

  it("counts a painted ground shadow as soft alpha, not as clear", async () => {
    // A shadow is a wide band of partial alpha, which is invisible on the
    // white page and a grey smudge on the near-black one. It is not fatal, so
    // the generator warns rather than refusing; this pins that it is visible
    // at all.
    const stats = await alphaStats(
      await image([
        { rows: 20, alpha: 0 },
        { rows: 20, alpha: 60 },
        { rows: 40, alpha: 255 },
      ]),
    );
    expect(stats.soft).toBeCloseTo(0.25, 1);
    expect(stats.clear).toBeCloseTo(0.25, 1);
  });

  it("treats an image with no alpha channel as fully opaque", async () => {
    // `--output-format jpeg` is refused with a transparent background, but a
    // three-channel image can also arrive from an `--background opaque` run,
    // and `ensureAlpha` must read it as solid rather than as clear.
    const rgb = await sharp({
      create: { width: WIDTH, height: HEIGHT, channels: 3, background: "#148cff" },
    })
      .png()
      .toBuffer();
    const stats = await alphaStats(rgb);
    expect(stats.clear).toBe(0);
    expect(stats.solid).toBe(1);
  });

  it("returns three fractions that sum to one", async () => {
    const stats = await alphaStats(
      await image([
        { rows: 30, alpha: 0 },
        { rows: 10, alpha: 90 },
        { rows: 40, alpha: 255 },
      ]),
    );
    expect(stats.clear + stats.solid + stats.soft).toBeCloseTo(1, 6);
  });
});
