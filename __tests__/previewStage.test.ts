/**
 * Unit tests for the live-preview stage height helper (a pure function;
 * the reserved-space behaviour it drives is CSS, exercised by the
 * Playwright specs against real browsers).
 */
import { describe, it, expect } from "vitest";

import {
  PREVIEW_HEIGHT_VAR,
  previewStageStyle,
} from "../app/_components/previewStage";

describe("previewStageStyle", () => {
  it("returns undefined when the block declares no height", () => {
    // The stylesheet's own default (300px) has to be what applies, so
    // the component must set no inline property at all rather than
    // spelling the default out a second time where it can drift.
    expect(previewStageStyle(undefined)).toBeUndefined();
  });

  it("treats a bare number as pixels", () => {
    expect(previewStageStyle(240)).toEqual({ [PREVIEW_HEIGHT_VAR]: "240px" });
  });

  it("passes a string through so CSS units and functions work", () => {
    expect(previewStageStyle("50vh")).toEqual({ [PREVIEW_HEIGHT_VAR]: "50vh" });
    expect(previewStageStyle("min(400px, 60vh)")).toEqual({
      [PREVIEW_HEIGHT_VAR]: "min(400px, 60vh)",
    });
  });

  it("keeps zero, which is a height and not an absent prop", () => {
    // `if (!previewHeight)` would send 0 down the undefined path and
    // silently restore the 300px default.
    expect(previewStageStyle(0)).toEqual({ [PREVIEW_HEIGHT_VAR]: "0px" });
  });

  it("sets the custom property the stylesheet reads, not `height`", () => {
    // The stylesheet owns the drag-resize floor and the empty-state
    // rules; an inline `height` would bypass both.
    const style = previewStageStyle(120)!;
    expect(Object.keys(style)).toEqual([PREVIEW_HEIGHT_VAR]);
    expect(PREVIEW_HEIGHT_VAR).toBe("--ch-preview-height");
  });
});
