// Pins which image models the generator sends through the Batch API
// (AGENTS.md, "Illustrations"). A batch naming a model Batch does not take is
// only refused after its file is uploaded and the job created, so `run` must
// fall back to `sync`, and `submit` must refuse, before anything is sent.
// Measured on 2026-11-05: both 2.6 variants answer `model_not_found` from
// Batch, while 2.5-flare runs there.
import { describe, expect, it } from "vitest";

import { supportsBatch } from "../scripts/generate-illustrations.mjs";

describe("supportsBatch", () => {
  it("keeps GPT Image 2.6 off the Batch API", () => {
    expect(supportsBatch("gpt-image-2.6-flare")).toBe(false);
    expect(supportsBatch("gpt-image-2.6-sunburst")).toBe(false);
    expect(supportsBatch("gpt-image-2.6")).toBe(false);
  });

  it("still batches the models Batch takes", () => {
    expect(supportsBatch("gpt-image-2.5-flare")).toBe(true);
    expect(supportsBatch("gpt-image-2.5-sunburst")).toBe(true);
    expect(supportsBatch("gpt-image-2")).toBe(true);
  });

  it("does not match a later release by prefix", () => {
    expect(supportsBatch("gpt-image-2.60")).toBe(true);
  });
});
