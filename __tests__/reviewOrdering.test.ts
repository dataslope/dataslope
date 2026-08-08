/**
 * The orderings behind the sort controls on both admin review galleries.
 *
 * Worth testing directly rather than through either page: both are behind an
 * admin gate, one is a static server component holding megabytes of inline SVG
 * and the other a client grid, and this project's test environment is Node
 * with no DOM. The comparators are the whole of the behaviour anyway.
 */
import { describe, expect, it } from "vitest";
import {
  ORDERINGS,
  ORDERING_LABELS,
  comparatorFor,
  isOrdering,
  orderBy,
  type Orderable,
} from "@/lib/review/ordering";

const row = (id: string, createdAt: string | null, group = "Zebra"): Orderable => ({
  id,
  createdAt,
  group,
});

/** Three dated rows plus two undated ones, deliberately out of order. */
const ROWS: Orderable[] = [
  row("charlie", "2026-03-01T00:00:00.000Z", "Statistics"),
  row("alpha", "2026-01-01T00:00:00.000Z", "Polars"),
  row("zulu", null, "Statistics"),
  row("bravo", "2026-02-01T00:00:00.000Z", "Polars"),
  row("delta", null, "Aardvark"),
];

const ids = (ordering: Parameters<typeof comparatorFor>[0]) =>
  orderBy(ROWS, ordering, (r) => r).map((r) => r.id);

describe("orderings", () => {
  it("sorts alphabetically by id", () => {
    expect(ids("alpha")).toEqual(["alpha", "bravo", "charlie", "delta", "zulu"]);
  });

  it("sorts oldest first, dated before undated", () => {
    expect(ids("oldest")).toEqual(["alpha", "bravo", "charlie", "delta", "zulu"]);
  });

  it("sorts newest first, dated before undated", () => {
    expect(ids("newest")).toEqual(["charlie", "bravo", "alpha", "delta", "zulu"]);
  });

  it("keeps undated rows last in BOTH directions", () => {
    // The point of the asymmetry: an artefact with no commit is unknown, not
    // old, so it must not lead "oldest first" and must not lead "newest first"
    // either. Reversing the dated head is what the two orderings do; the
    // undated tail stays where it is.
    expect(ids("oldest").slice(-2)).toEqual(["delta", "zulu"]);
    expect(ids("newest").slice(-2)).toEqual(["delta", "zulu"]);
  });

  it("sorts by course, then by id inside a course", () => {
    expect(ids("course")).toEqual(["delta", "alpha", "bravo", "charlie", "zulu"]);
  });

  it("is total, so equal keys still order deterministically", () => {
    const tied = [row("b", "2026-01-01T00:00:00.000Z"), row("a", "2026-01-01T00:00:00.000Z")];
    expect(orderBy(tied, "newest", (r) => r).map((r) => r.id)).toEqual(["a", "b"]);
    expect(orderBy(tied, "oldest", (r) => r).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("compares ISO timestamps across timezones correctly", () => {
    // build-created-at.mjs normalises to UTC precisely so string comparison is
    // safe; this pins the property that makes that normalisation load-bearing.
    const utc = row("utc", "2026-01-01T00:00:00.000Z");
    const later = row("later", "2026-01-01T09:00:00.000Z");
    expect(comparatorFor("oldest")(utc, later)).toBeLessThan(0);
    expect(comparatorFor("newest")(utc, later)).toBeGreaterThan(0);
  });

  it("does not sort the caller's array in place", () => {
    const before = ROWS.map((r) => r.id);
    orderBy(ROWS, "newest", (r) => r);
    expect(ROWS.map((r) => r.id)).toEqual(before);
  });

  it("recognises exactly the orderings it offers, and labels all of them", () => {
    for (const o of ORDERINGS) {
      expect(isOrdering(o)).toBe(true);
      expect(ORDERING_LABELS[o]).toBeTruthy();
    }
    for (const bad of ["", "default", "Alpha", "date", null, 3]) {
      expect(isOrdering(bad)).toBe(false);
    }
  });
});
