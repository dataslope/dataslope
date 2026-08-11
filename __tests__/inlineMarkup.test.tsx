import { describe, expect, it } from "vitest";
import { isValidElement } from "react";
import { withInlineMarkup } from "../app/_components/mdx/inlineMarkup";

// A callout's `title`, a <Figure>'s `caption` and a chart spec's `caption` are
// all JSX attributes, so MDX delivers them as strings and markdown never
// touches them. Code spans, strong and emphasis are honoured there; see the
// module for the flanking rule that keeps `*args, **kwargs` intact.

/** The rendered shape as plain data: strings stay strings, elements become
 *  `tag:<text>`. */
function shape(node: ReturnType<typeof withInlineMarkup>): unknown {
  if (Array.isArray(node)) return node.map(shape);
  if (isValidElement<{ children: string }>(node)) {
    return `${node.type as string}:${node.props.children}`;
  }
  return node;
}

describe("withInlineMarkup", () => {
  it("turns a backtick span into a code element", () => {
    expect(shape(withInlineMarkup("`gets()` is so dangerous"))).toEqual([
      "code:gets()",
      " is so dangerous",
    ]);
  });

  it("handles several spans and keeps the text between them", () => {
    expect(shape(withInlineMarkup("`=` is assignment, `==` is comparison"))).toEqual([
      "code:=",
      " is assignment, ",
      "code:==",
      " is comparison",
    ]);
  });

  it("leaves a title with no markup exactly as it was", () => {
    const title = "Where the term comes from";
    expect(withInlineMarkup(title)).toBe(title);
  });

  it("renders a code span in a figure caption", () => {
    expect(shape(withInlineMarkup("`melt()` unpivots; `pivot()` pivots."))).toEqual([
      "code:melt()",
      " unpivots; ",
      "code:pivot()",
      " pivots.",
    ]);
  });

  it("leaves an unpaired backtick literal, as markdown would", () => {
    const title = "a stray ` backtick";
    expect(withInlineMarkup(title)).toBe(title);
  });

  it("passes a non-string title through untouched", () => {
    expect(withInlineMarkup(undefined)).toBe(undefined);
    const node = <span>already JSX</span>;
    expect(withInlineMarkup(node)).toBe(node);
  });

  // Emphasis. A chart caption writing "fits the conditional *mean*" printed
  // its own asterisks on the page before this existed.
  it("renders single asterisks as emphasis", () => {
    expect(shape(withInlineMarkup("Least squares fits the conditional *mean*."))).toEqual([
      "Least squares fits the conditional ",
      "em:mean",
      ".",
    ]);
  });

  it("renders double asterisks as strong, not as an empty emphasis pair", () => {
    expect(shape(withInlineMarkup("**Mode** is the only one for categories"))).toEqual([
      "strong:Mode",
      " is the only one for categories",
    ]);
  });

  it("handles strong and emphasis in one string", () => {
    expect(shape(withInlineMarkup("**pair** whenever the design *lets* you"))).toEqual([
      "strong:pair",
      " whenever the design ",
      "em:lets",
      " you",
    ]);
  });

  // The reason the flanking rule is encoded rather than a bare /\*(.+?)\*/.
  // `*args, **kwargs` is Python syntax in a real lesson title; every asterisk
  // in it is preceded by a space, so none of them can close a span.
  it("never treats Python's star-args as emphasis", () => {
    const title = "Why *args, **kwargs?";
    expect(withInlineMarkup(title)).toBe(title);
  });

  it("leaves an asterisk with a space after it alone", () => {
    const title = "multiply with * and divide with /";
    expect(withInlineMarkup(title)).toBe(title);
  });

  // Code spans are split off first, so an identifier's asterisks survive.
  // This caption is live on the Polars reading-and-writing page.
  it("protects asterisks inside a code span", () => {
    expect(shape(withInlineMarkup("`read_*()` loads it all; `scan_*()` peers in."))).toEqual([
      "code:read_*()",
      " loads it all; ",
      "code:scan_*()",
      " peers in.",
    ]);
  });

  it("applies emphasis around a code span without touching it", () => {
    expect(shape(withInlineMarkup("fill with the *past* only: `ffill()`"))).toEqual([
      "fill with the ",
      "em:past",
      " only: ",
      "code:ffill()",
    ]);
  });

  // Underscores stay literal: in an attribute they are nearly always part of
  // an identifier rather than an author's markup.
  it("does not treat underscores as emphasis", () => {
    const caption = "add a was_missing indicator";
    expect(withInlineMarkup(caption)).toBe(caption);
  });
});
