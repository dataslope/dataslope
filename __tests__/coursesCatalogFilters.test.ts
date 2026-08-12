import { describe, expect, it } from "vitest";
import {
  readFilters,
  writeFilters,
} from "../app/courses/_components/catalogFilters";

// The `/courses` catalog keeps its language and level selection in the query
// string so a filtered catalog can be linked. These are the two ends of that:
// what a URL means when someone arrives on one, and what the address bar should
// say once they start clicking. See app/courses/_components/catalogFilters.ts.
const LANGUAGES = ["python", "sql", "javascript", "r"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const read = (search: string) => readFilters(search, LANGUAGES, LEVELS);

describe("reading catalog filters from a URL", () => {
  it("has no filters when the query string is empty", () => {
    expect(read("")).toEqual({ langs: [], levels: [] });
    expect(read("?")).toEqual({ langs: [], levels: [] });
  });

  it("reads a language, a level, or both", () => {
    expect(read("?lang=python")).toEqual({ langs: ["python"], levels: [] });
    expect(read("?level=beginner")).toEqual({ langs: [], levels: ["beginner"] });
    expect(read("?lang=sql&level=advanced")).toEqual({
      langs: ["sql"],
      levels: ["advanced"],
    });
  });

  it("reads the parameters in either order, and past unrelated ones", () => {
    expect(read("?level=beginner&lang=r")).toEqual({
      langs: ["r"],
      levels: ["beginner"],
    });
    expect(read("?utm_source=newsletter&lang=python&ref=x")).toEqual({
      langs: ["python"],
      levels: [],
    });
  });

  // A stale or hand-typed link should land on the whole catalog rather than on
  // an empty list filtered by something with no sidebar row to switch off.
  it("ignores values this catalog does not have", () => {
    expect(read("?lang=cobol")).toEqual({ langs: [], levels: [] });
    expect(read("?level=expert")).toEqual({ langs: [], levels: [] });
    expect(read("?lang=cobol&level=beginner")).toEqual({
      langs: [],
      levels: ["beginner"],
    });
  });

  it("ignores an empty or valueless parameter", () => {
    expect(read("?lang=&level=")).toEqual({ langs: [], levels: [] });
    expect(read("?lang")).toEqual({ langs: [], levels: [] });
  });

  // Matching is exact: the sidebar's ids are lowercase, and a near miss is a
  // value the catalog cannot act on.
  it("does not match on case or whitespace", () => {
    expect(read("?lang=Python")).toEqual({ langs: [], levels: [] });
    expect(read("?lang=%20python")).toEqual({ langs: [], levels: [] });
  });
});

describe("writing catalog filters to a URL", () => {
  it("is empty when nothing is selected", () => {
    expect(writeFilters("", [], [])).toBe("");
  });

  it("writes the selection", () => {
    expect(writeFilters("", ["python"], [])).toBe("lang=python");
    expect(writeFilters("", [], ["beginner"])).toBe("level=beginner");
    expect(writeFilters("", ["sql"], ["advanced"])).toBe(
      "lang=sql&level=advanced",
    );
  });

  it("replaces a previous selection rather than appending to it", () => {
    expect(writeFilters("?lang=python", ["sql"], [])).toBe("lang=sql");
    expect(writeFilters("?lang=python&level=beginner", ["sql"], ["advanced"]))
      .toBe("lang=sql&level=advanced");
  });

  it("drops a parameter when its filter is cleared", () => {
    expect(writeFilters("?lang=python&level=beginner", [], ["beginner"])).toBe(
      "level=beginner",
    );
    expect(writeFilters("?lang=python&level=beginner", [], [])).toBe("");
  });

  // Somebody arriving from a campaign link and then clicking a filter should
  // keep their campaign tag.
  it("leaves parameters that are not ours alone", () => {
    expect(writeFilters("?utm_source=newsletter", ["python"], [])).toBe(
      "utm_source=newsletter&lang=python",
    );
    expect(writeFilters("?utm_source=newsletter&lang=python", [], [])).toBe(
      "utm_source=newsletter",
    );
  });

  // The pair has to compose: what is written must read back identically, or
  // the address bar and the list would drift apart as someone clicks around.
  it("round-trips with readFilters", () => {
    for (const [langs, levels] of [
      [[], []],
      [["python"], []],
      [[], ["advanced"]],
      [["sql"], ["beginner"]],
    ] as const) {
      const query = writeFilters("", langs, levels);
      expect(read(query ? `?${query}` : "")).toEqual({
        langs: [...langs],
        levels: [...levels],
      });
    }
  });
});
