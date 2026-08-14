// Pins the build guard against a prefetch request storm: the guard
// (scripts/check-prefetch-hints.mjs) greps prerendered payloads for
// PrefetchHint.InliningHintsStale, whose value it hardcodes. Next's flight
// format is internal, so the bit value and payload shapes are asserted here
// against Next's shipped code — an upstream renumbering fails loudly.
import { describe, expect, it } from "vitest";

// @ts-expect-error -- internal Next module, no types exported
import { PrefetchHint } from "next/dist/esm/shared/lib/app-router-types.js";
import {
  INLINING_HINTS_STALE,
  staleFlagsIn,
} from "../scripts/check-prefetch-hints.mjs";

describe("check-prefetch-hints", () => {
  it("checks the same bit Next calls InliningHintsStale", () => {
    expect(PrefetchHint.InliningHintsStale).toBe(INLINING_HINTS_STALE);
  });

  it("flags a poisoned initial payload", () => {
    // The shape observed on the poisoned deploys: 4608 = Eager | Stale.
    const row =
      '0:{"f":[[["",{"children":["__PAGE__",{},"$undefined","$undefined",4608]},"$undefined","$undefined",4624]]]}';
    expect(staleFlagsIn(row)).toEqual([4608, 4624]);
  });

  it("flags a poisoned segment tree file", () => {
    const tree = '{"tree":{"name":"","prefetchHints":4624,"slots":null}}';
    expect(staleFlagsIn(tree)).toEqual([4624]);
  });

  it("passes the clean shapes a healthy build emits", () => {
    const clean =
      '["__PAGE__",{},"$undefined","$undefined",4224]},"$undefined","$undefined",4112]' +
      '{"prefetchHints":4096}';
    expect(staleFlagsIn(clean)).toEqual([]);
  });

  it("ignores unrelated numbers in prose and code", () => {
    expect(staleFlagsIn('const x = [512, 4608]; "flags",512]')).toEqual([]);
  });
});
