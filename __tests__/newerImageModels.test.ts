// Pins the check that keeps illustration runs on the latest OpenAI image model
// (AGENTS.md, "Illustrations"). The model is pinned in `meta.model`, so this
// warning is the only thing that notices a newer release; the two ways it goes
// wrong are crying wolf at a launch sibling, and going quiet about a real
// successor because a dated snapshot shadows it.
import { describe, expect, it } from "vitest";

import { newerImageModels } from "../scripts/generate-illustrations.mjs";

const DAY = 24 * 60 * 60;
const at = (date: string, offsetS = 0) => Date.parse(`${date}T00:00:00Z`) / 1000 + offsetS;

// Shaped like GET /v1/models, as it read on 2026-10-21.
const MODELS = [
  { id: "gpt-image-1", created: at("2025-04-24") },
  { id: "gpt-image-1.5", created: at("2025-11-25") },
  { id: "chatgpt-image-latest", created: at("2025-12-16") },
  { id: "gpt-image-2", created: at("2026-04-17") },
  { id: "gpt-image-2-2026-04-21", created: at("2026-04-17", 60) },
  { id: "gpt-image-2.5-flare", created: at("2026-09-04") },
  { id: "gpt-image-2.5-sunburst", created: at("2026-09-04", 5) },
  { id: "gpt-image-2.5-flare-2026-09-08", created: at("2026-09-08") },
  { id: "gpt-4o", created: at("2026-10-01") },
];

describe("newerImageModels", () => {
  it("lists every later image release, newest first", () => {
    expect(newerImageModels(MODELS, "gpt-image-1.5")).toEqual([
      "gpt-image-2.5-sunburst",
      "gpt-image-2.5-flare",
      "gpt-image-2",
    ]);
  });

  it("treats variants launched together as one release", () => {
    expect(newerImageModels(MODELS, "gpt-image-2.5-flare")).toEqual([]);
    expect(newerImageModels(MODELS, "gpt-image-2.5-sunburst")).toEqual([]);
  });

  it("ignores dated snapshots, ChatGPT aliases, and non-image models", () => {
    const later = [...MODELS, { id: "gpt-image-3", created: at("2027-01-10") }];
    expect(newerImageModels(later, "gpt-image-2.5-flare")).toEqual(["gpt-image-3"]);
  });

  it("flags a successor released the day after", () => {
    const next = [...MODELS, { id: "gpt-image-2.6", created: at("2026-09-04", DAY + 1) }];
    expect(newerImageModels(next, "gpt-image-2.5-flare")).toEqual(["gpt-image-2.6"]);
  });

  it("says nothing about a model the API does not list", () => {
    expect(newerImageModels(MODELS, "gpt-image-9")).toEqual([]);
  });
});
