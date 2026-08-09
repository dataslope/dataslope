import { describe, expect, it } from "vitest";
import { isValidElement } from "react";
import { withInlineCode } from "../app/_components/mdx/CalloutWithCodeTitle";

// A callout's `title` is a JSX attribute, so MDX delivers it as a string and
// markdown never touches it. Backticks are the one piece of markup worth
// honouring there; see the module for why emphasis deliberately is not.

/** The rendered shape as plain data: strings stay strings, code spans become
 *  `code:<text>`. */
function shape(node: ReturnType<typeof withInlineCode>): unknown {
  if (Array.isArray(node)) return node.map(shape);
  if (isValidElement<{ children: string }>(node)) {
    return `${node.type as string}:${node.props.children}`;
  }
  return node;
}

describe("withInlineCode", () => {
  it("turns a backtick span into a code element", () => {
    expect(shape(withInlineCode("`gets()` is so dangerous"))).toEqual([
      "code:gets()",
      " is so dangerous",
    ]);
  });

  it("handles several spans and keeps the text between them", () => {
    expect(shape(withInlineCode("`=` is assignment, `==` is comparison"))).toEqual([
      "code:=",
      " is assignment, ",
      "code:==",
      " is comparison",
    ]);
  });

  it("leaves a title with no backticks exactly as it was", () => {
    const title = "Where the term comes from";
    expect(withInlineCode(title)).toBe(title);
  });

  // The reason this parses code spans and nothing else. `*args, **kwargs` is
  // Python syntax in a real lesson title; a markdown emphasis pass would eat
  // the asterisks and rewrite the heading of the page teaching them.
  it("never treats asterisks as emphasis", () => {
    const title = "Why *args, **kwargs?";
    expect(withInlineCode(title)).toBe(title);
  });

  it("leaves an unpaired backtick literal, as markdown would", () => {
    const title = "a stray ` backtick";
    expect(withInlineCode(title)).toBe(title);
  });

  it("passes a non-string title through untouched", () => {
    expect(withInlineCode(undefined)).toBe(undefined);
    const node = <span>already JSX</span>;
    expect(withInlineCode(node)).toBe(node);
  });
});
