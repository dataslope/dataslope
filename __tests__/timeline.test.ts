import { describe, expect, it } from "vitest";
import { parseMermaidTimeline } from "../app/_components/mdx/timeline";

describe("parseMermaidTimeline", () => {
  it("extracts the title and one entry per period", () => {
    const chart = [
      "timeline",
      "    title The C family tree",
      "    1972 : C by Dennis Ritchie at Bell Labs",
      "    1973 : UNIX rewritten in C",
    ].join("\n");

    const { title, entries } = parseMermaidTimeline(chart);

    expect(title).toBe("The C family tree");
    expect(entries).toEqual([
      { period: "1972", events: ["C by Dennis Ritchie at Bell Labs"] },
      { period: "1973", events: ["UNIX rewritten in C"] },
    ]);
  });

  it("splits only on the first colon so event text may contain colons", () => {
    const chart = [
      "timeline",
      '    1996 : Ihaka & Gentleman publish "R: A Language for Data Analysis"',
    ].join("\n");

    const { entries } = parseMermaidTimeline(chart);

    expect(entries).toEqual([
      {
        period: "1996",
        events: ['Ihaka & Gentleman publish "R: A Language for Data Analysis"'],
      },
    ]);
  });

  it("attaches continuation lines as extra events under the prior period", () => {
    const chart = [
      "timeline",
      "    1996 : First event",
      "           Second event on the same year",
    ].join("\n");

    const { entries } = parseMermaidTimeline(chart);

    expect(entries).toEqual([
      {
        period: "1996",
        events: ["First event", "Second event on the same year"],
      },
    ]);
  });

  it("handles literal \\n escapes from the Mermaid pipeline", () => {
    const chart = "timeline\\n    title T\\n    2009 : ECMAScript 5";

    const { title, entries } = parseMermaidTimeline(chart);

    expect(title).toBe("T");
    expect(entries).toEqual([{ period: "2009", events: ["ECMAScript 5"] }]);
  });

  it("keeps section labels as standalone entries", () => {
    const chart = [
      "timeline",
      "    section 21st century",
      "    2009 : Node.js",
    ].join("\n");

    const { entries } = parseMermaidTimeline(chart);

    expect(entries).toEqual([
      { period: "21st century", events: [] },
      { period: "2009", events: ["Node.js"] },
    ]);
  });
});
