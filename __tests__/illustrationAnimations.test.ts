// Animated cut-outs (`scripts/animate-illustrations.mjs`) are served in the
// static cut-out's place, inside the box the static manifest entry reserves.
// That only works while the two agree on shape, so this pins every entry in
// data/illustration-animations.json to an encoded file with the static
// file's aspect ratio. A failure usually means the animation was regenerated
// or the static art re-trimmed without re-running
// `node scripts/animate-illustrations.mjs encode` and `build-images`.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import imageManifest from "../lib/generated/images.js";
import { buildPrompt, placement } from "../scripts/animate-illustrations.mjs";

const spec = JSON.parse(
  readFileSync(path.join(process.cwd(), "data", "illustration-animations.json"), "utf8"),
);
const prompts = JSON.parse(
  readFileSync(path.join(process.cwd(), "data", "illustration-prompts.json"), "utf8"),
);

describe("illustration animations", () => {
  it("draws on the same model as the static art", () => {
    expect(spec.meta.model).toBe(prompts.meta.model);
    expect(spec.meta.quality).toBe("low");
    expect(spec.meta.background).toBe("transparent");
  });

  for (const entry of spec.animations) {
    describe(entry.id, () => {
      it("asks for a sheet the API accepts", () => {
        // GIF frames come back as a sheet four across, longest edge <= 3840.
        const [w, h] = entry.size.split("x").map(Number);
        expect(Math.max(w, h)).toBeLessThanOrEqual(960);
        expect(entry.frames).toBeGreaterThanOrEqual(2);
        expect(entry.frames).toBeLessThanOrEqual(16);
        expect(buildPrompt(spec.meta, entry)).not.toMatch(/\{\w+\}/);
      });

      it("is encoded with the static cut-out's aspect ratio", () => {
        const still = imageManifest[`${entry.id}-cutout`];
        const animated = imageManifest[`${entry.id}-animated`];
        expect(still, `${entry.id}-cutout is not promoted`).toBeDefined();
        expect(animated, `${entry.id}-animated.webp has not been encoded`).toBeDefined();
        // Rounding both sides to whole pixels moves a ratio by at most one
        // pixel's worth of the smaller canvas.
        const tolerance = 1.5 / animated.height;
        expect(Math.abs(animated.width / animated.height - still.width / still.height)).toBeLessThan(
          tolerance * (still.width / still.height),
        );
        if (entry.maxWidth) expect(animated.width).toBeLessThanOrEqual(entry.maxWidth);
      });
    });
  }
});

describe("placement", () => {
  const still = { width: 1000, height: 800 };
  const box = { x0: 200, y0: 100, x1: 800, y1: 700, w: 600, h: 600 };

  it("maps the animation's subject onto the static subject", () => {
    const p = placement(still, box, { x0: 0, y0: 0, x1: 300, y1: 300, w: 300, h: 300 });
    expect(p).toEqual({ W: 500, H: 400, w: 300, h: 300, left: 100, top: 50 });
  });

  it("shrinks a motion that reaches past the canvas top", () => {
    const p = placement(still, box, { x0: 0, y0: 0, x1: 300, y1: 450, w: 300, h: 450 });
    expect(p.top).toBe(0);
    expect(p.top + p.h).toBe(350); // still standing on the static baseline
    expect(Math.abs(p.left + p.w / 2 - 250)).toBeLessThanOrEqual(1);
  });

  it("caps the canvas at maxWidth", () => {
    const p = placement(still, box, { x0: 0, y0: 0, x1: 300, y1: 300, w: 300, h: 300 }, 250);
    expect(p.W).toBe(250);
    expect(p.w).toBe(150);
  });
});
