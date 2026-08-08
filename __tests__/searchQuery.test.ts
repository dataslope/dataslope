import { describe, expect, it } from "vitest";

import { toMatchQuery } from "@/lib/search/query";

describe("toMatchQuery", () => {
  it("quotes every token so no input can become an operator", () => {
    expect(toMatchQuery("truncated axis")).toBe('"truncated" AND "axis"*');
  });

  it("prefix-matches only the last token, so typing keeps up", () => {
    expect(toMatchQuery("quant")).toBe('"quant"*');
    expect(toMatchQuery("bar chart quant")).toBe('"bar" AND "chart" AND "quant"*');
  });

  // The bug this whole module exists for: FTS5 reads `-` as a column filter,
  // so the raw string asks for a column named "attentive" and throws.
  it("neutralises hyphens, which FTS5 would read as a column filter", () => {
    expect(toMatchQuery("pre-attentive")).toBe('"pre" AND "attentive"*');
  });

  it("keeps identifiers with underscores whole", () => {
    expect(toMatchQuery("value_counts")).toBe('"value_counts"*');
  });

  it("strips FTS5 operators of their meaning", () => {
    expect(toMatchQuery("NEAR(x y)")).toBe('"near" AND "x" AND "y"*');
    // `NOT` survives tokenising (it is a keyword in too many languages to be a
    // stop word) but comes out quoted, so FTS5 reads it as a word to find
    // rather than as negation.
    expect(toMatchQuery("foo NOT bar")).toBe('"foo" AND "not" AND "bar"*');
    // `OR` happens to be a stop word, so it is dropped outright.
    expect(toMatchQuery("foo OR bar")).toBe('"foo" AND "bar"*');
  });

  it("cannot be used to inject a second MATCH clause", () => {
    const out = toMatchQuery('x" OR docs MATCH "y');
    expect(out).toBe('"x" AND "docs" AND "match" AND "y"*');
    // Every quote in the output is one this module put there.
    expect(out?.match(/"/g)?.length).toBe(8);
  });

  it("returns null when there is nothing searchable", () => {
    expect(toMatchQuery("")).toBeNull();
    expect(toMatchQuery("   ")).toBeNull();
    expect(toMatchQuery("***")).toBeNull();
    expect(toMatchQuery("\\")).toBeNull();
  });

  it("keeps accented and non-Latin words", () => {
    expect(toMatchQuery("café")).toBe('"café"*');
    expect(toMatchQuery("日本語")).toBe('"日本語"*');
  });

  // Stop words are dropped because every token becomes an AND clause, so a
  // natural-language question was being decided by its weakest word.
  it("drops stop words from a natural-language question", () => {
    expect(toMatchQuery("why is a truncated axis misleading")).toBe(
      '"is" AND "truncated" AND "axis" AND "misleading"*',
    );
    expect(toMatchQuery("how do I compare two groups")).toBe(
      '"compare" AND "two" AND "groups"*',
    );
  });

  it("keeps stop words when they are all the query has", () => {
    expect(toMatchQuery("why")).toBe('"why"*');
    expect(toMatchQuery("how to")).toBe('"how" AND "to"*');
  });

  it("caps very long queries", () => {
    const out = toMatchQuery("a b c d e f g h i j k l m n o p q r s t u v");
    expect(out?.split(" AND ")).toHaveLength(12);
  });
});
