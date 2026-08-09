/**
 * Query-time search behaviour: scope parsing/boosting SQL and the row → result
 * grouping in lib/search/ranking.ts.
 */
import { describe, expect, it } from "vitest";
import {
  parseScope,
  searchScopeFor,
  searchSql,
  toResults,
  type SearchRow,
} from "@/lib/search/ranking";

function row(overrides: Partial<SearchRow>): SearchRow {
  return {
    url: "/courses/a/lesson#sec",
    page: "/courses/a/lesson",
    anchor: "sec",
    section: "Course A",
    title: "Lesson",
    heading: "Section",
    excerpt: "…around the <mark>match</mark>…",
    codeExcerpt: "",
    ...overrides,
  };
}

describe("parseScope", () => {
  it("parses course and interview scopes", () => {
    expect(parseScope("courses/mastering-ggplot2")).toEqual({
      collection: "courses",
      page: "/courses/mastering-ggplot2",
      pagePrefix: "/courses/mastering-ggplot2/%",
    });
    expect(parseScope("interview/data-scientist")).toEqual({
      collection: "interview",
      page: "/interview-prep/data-scientist",
      pagePrefix: "/interview-prep/data-scientist/%",
    });
  });

  it("rejects anything that is not a clean scope", () => {
    expect(parseScope(null)).toBeNull();
    expect(parseScope("")).toBeNull();
    expect(parseScope("blog/foo")).toBeNull();
    expect(parseScope("courses/Weird Slug")).toBeNull();
    expect(parseScope("courses/has_underscore")).toBeNull(); // LIKE metachar
    expect(parseScope("courses/a/b")).toBeNull();
    expect(parseScope("courses/-leading")).toBeNull();
  });

  it("round-trips what the dialog derives from a pathname", () => {
    const paths = [
      "/courses/plotly-express/bar-charts",
      "/courses/mastering-ggplot2",
      "/interview-prep/data-scientist/multiple-choice-questions",
    ];
    for (const p of paths) {
      const tag = searchScopeFor(p);
      expect(tag).toBeDefined();
      const scope = parseScope(tag!);
      expect(scope).not.toBeNull();
      expect(p === scope!.page || p.startsWith(`${scope!.page}/`)).toBe(true);
    }
    expect(searchScopeFor("/pricing")).toBeUndefined();
    expect(searchScopeFor("/courses")).toBeUndefined();
  });
});

describe("searchSql", () => {
  it("only the scoped variant carries the boost parameters", () => {
    expect(searchSql(true)).toContain("?5");
    expect(searchSql(false)).not.toContain("?3");
    expect(searchSql(false)).not.toContain("?4");
    expect(searchSql(false)).not.toContain("?5");
  });

  it("both variants damp component rows", () => {
    expect(searchSql(true)).toContain("heading = ''");
    expect(searchSql(false)).toContain("heading = ''");
  });
});

describe("toResults", () => {
  it("groups rows page-first and keeps the first-seen page position", () => {
    const out = toResults(
      [
        row({ page: "/courses/a/x", url: "/courses/a/x#one", anchor: "one", heading: "One", excerpt: "…first <mark>match</mark> in a stacked chart…" }),
        row({ page: "/courses/b/y", url: "/courses/b/y#two", anchor: "two", heading: "Two", section: "Course B", excerpt: "…second <mark>match</mark> about dodging…" }),
        row({ page: "/courses/a/x", url: "/courses/a/x#three", anchor: "three", heading: "Three", excerpt: "…third <mark>match</mark> on filled bars…" }),
      ],
      24,
    );
    expect(out.map((r) => [r.type, r.url])).toEqual([
      ["page", "/courses/a/x"],
      ["heading", "/courses/a/x#one"],
      ["text", "/courses/a/x#one"],
      ["page", "/courses/b/y"],
      ["heading", "/courses/b/y#two"],
      ["text", "/courses/b/y#two"],
      ["heading", "/courses/a/x#three"],
      ["text", "/courses/a/x#three"],
    ]);
    expect(out[0].breadcrumbs).toEqual(["Course A"]);
  });

  it("a null-anchor row is the page-level result and adds no child entry", () => {
    const out = toResults([row({ anchor: null, url: "/courses/a/lesson", heading: "" })], 24);
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("page");
  });

  it("component rows become text entries at the component's anchor", () => {
    const out = toResults(
      [row({ url: "/courses/a/lesson#x-mcq-2", anchor: "x-mcq-2", heading: "" })],
      24,
      ["historical", "reasons"],
    );
    expect(out.map((r) => r.type)).toEqual(["page", "text"]);
    expect(out[1].url).toBe("/courses/a/lesson?hl=historical%20reasons#x-mcq-2");
    expect(out[0].url).toBe("/courses/a/lesson?hl=historical%20reasons");
  });

  it("collapses the section-row duplicate of a component match onto the component's anchor", () => {
    const excerpt = "…Purely for <mark>historical</mark> reasons with no practical effect…";
    const rows = [
      row({ url: "/courses/a/lesson#x-mcq-2", anchor: "x-mcq-2", heading: "", excerpt }),
      row({ url: "/courses/a/lesson#stats", anchor: "stats", heading: "Every Geom Has a Stat", excerpt }),
    ];
    for (const ordered of [rows, [...rows].reverse()]) {
      const out = toResults(ordered, 24);
      const texts = out.filter((r) => r.type === "text");
      expect(texts).toHaveLength(1);
      expect(texts[0].url).toBe("/courses/a/lesson#x-mcq-2");
      // The heading entry itself survives; only the duplicated snippet folds.
      expect(out.filter((r) => r.type === "heading")).toHaveLength(1);
    }
  });

  it("keeps distinct snippets from the same page separate", () => {
    const out = toResults(
      [
        row({ url: "/courses/a/lesson#x-mcq-1", anchor: "x-mcq-1", heading: "", excerpt: "…the <mark>stat</mark> creates new variables and you can use them…" }),
        row({ url: "/courses/a/lesson#x-mcq-2", anchor: "x-mcq-2", heading: "", excerpt: "…a completely different <mark>stat</mark>ement about geoms…" }),
      ],
      24,
    );
    expect(out.filter((r) => r.type === "text")).toHaveLength(2);
  });

  it("falls back to the code snippet when only code matched", () => {
    const out = toResults(
      [
        row({
          heading: "Setup",
          excerpt: "plain prose without a match",
          codeExcerpt: "…<mark>geom_bar</mark>(stat = 'identity')…",
        }),
      ],
      24,
    );
    const text = out.find((r) => r.type === "text");
    expect(text?.content).toContain("<mark>geom_bar</mark>");
  });

  it("emits no text entry when nothing highlighted", () => {
    const out = toResults(
      [row({ heading: "Heading Match", excerpt: "leading prose, no mark", codeExcerpt: "" })],
      24,
    );
    expect(out.map((r) => r.type)).toEqual(["page", "heading"]);
  });

  it("caps how many rows one page may spend, so other pages still surface", () => {
    const hog = Array.from({ length: 8 }, (_, i) =>
      row({
        page: "/courses/a/hog",
        url: `/courses/a/hog#h${i}`,
        anchor: `h${i}`,
        heading: `H${i}`,
        excerpt: `…<mark>match</mark> number ${i} entirely unlike the others ${"pad".repeat(i + 1)}…`,
      }),
    );
    const other = row({
      page: "/courses/b/other",
      url: "/courses/b/other#sec",
      section: "Course B",
      heading: "Other",
    });
    const out = toResults([...hog, other], 8);
    expect(out.filter((r) => r.type === "heading" && r.url.includes("/hog#"))).toHaveLength(4);
    expect(out.some((r) => r.type === "page" && r.url === "/courses/b/other")).toBe(true);
  });

  it("skips component rows whose match is invisible (title-only), without spending budget", () => {
    const invisible = row({
      url: "/courses/a/lesson#x-note-1",
      anchor: "x-note-1",
      heading: "",
      excerpt: "no mark anywhere here",
      codeExcerpt: "",
    });
    // Alone, it produces nothing at all: its page will surface via the other
    // rows the same (title) match necessarily hit.
    expect(toResults([invisible], 24)).toEqual([]);
    // And it does not consume the row budget ahead of visible rows.
    const visible = row({ page: "/courses/b/y", url: "/courses/b/y#sec", section: "Course B" });
    const out = toResults([invisible, visible], 1);
    expect(out.some((r) => r.url === "/courses/b/y#sec")).toBe(true);
  });

  it("keeps section rows that matched only via title: the heading entry still routes the reader", () => {
    const out = toResults(
      [row({ heading: "Bars and Histograms", excerpt: "no mark", codeExcerpt: "" })],
      24,
    );
    expect(out.map((r) => r.type)).toEqual(["page", "heading"]);
  });

  it("adds no hl parameter when there are no tokens", () => {
    const out = toResults([row({})], 24);
    expect(out.every((r) => !r.url.includes("hl="))).toBe(true);
  });
});
