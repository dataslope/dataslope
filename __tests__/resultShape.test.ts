import { describe, expect, it } from "vitest";
import { sameResultShape } from "../app/_components/sql/components/ResultView";
import type { QueryRunResult } from "../app/_components/sql/types";

const run = (
  sets: ({ columns: string[]; values: unknown[][] } | null)[],
): QueryRunResult =>
  ({
    sets,
    elapsedMs: 1,
    source: "Query 1",
  }) as QueryRunResult;

describe("sameResultShape", () => {
  it("matches re-runs of the same statements regardless of row data", () => {
    const a = run([null, { columns: ["id", "name"], values: [[1, "a"]] }]);
    const b = run([
      null,
      { columns: ["id", "name"], values: [[1, "edited"], [2, "b"]] },
    ]);
    expect(sameResultShape(a, b)).toBe(true);
  });

  it("rejects results with different set counts", () => {
    const a = run([{ columns: ["id"], values: [] }]);
    const b = run([{ columns: ["id"], values: [] }, null]);
    expect(sameResultShape(a, b)).toBe(false);
  });

  it("rejects results whose per-set null-ness differs", () => {
    const a = run([null, { columns: ["id"], values: [] }]);
    const b = run([{ columns: ["id"], values: [] }, null]);
    expect(sameResultShape(a, b)).toBe(false);
  });

  it("rejects results with different column names", () => {
    const a = run([{ columns: ["id", "name"], values: [] }]);
    const b = run([{ columns: ["id", "email"], values: [] }]);
    expect(sameResultShape(a, b)).toBe(false);
  });

  it("treats a null previous result as a fresh run", () => {
    const a = run([{ columns: ["id"], values: [] }]);
    expect(sameResultShape(a, null)).toBe(false);
    expect(sameResultShape(null, a)).toBe(false);
    expect(sameResultShape(null, null)).toBe(false);
  });
});
