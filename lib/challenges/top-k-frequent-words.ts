/**
 * "Top K Frequent Words" — the single-step challenge.
 *
 * No step rail; instead a language picker over one editor. Python and
 * JavaScript get their own starter, solution and checks, because the idiom
 * that makes the tiebreak easy differs: a sort key tuple in Python, a
 * comparator chain in JavaScript.
 */

import { jsSignature } from "./signatures";
import type { Challenge } from "./types";

export const TOP_K_FREQUENT_WORDS: Challenge = {
  slug: "top-k-frequent-words",
  title: "Top K Frequent Words",
  difficulty: "Intermediate",
  catalog: { topic: "Hash maps", langs: ["python", "javascript"] },
  languageLabel: "Python",
  description:
    "Return the k most frequent words, most frequent first, breaking ties alphabetically.",
  runtime: { kind: "code" },
  schema: [],
  submitLabel: "Submit",
  submissionColumns: ["result", "lang", "runtime", "when"],
  keyStrip: [],
  steps: [],
  instructions: [
    {
      kind: "prose",
      spans: [
        "Given a list of words and an integer ",
        { code: "k" },
        ", return the ",
        { code: "k" },
        " most frequent words, most frequent first. When two words appear the same number of times, the one that comes first alphabetically goes first.",
      ],
    },
    {
      kind: "prose",
      spans: [
        "Comparison is case-sensitive. Aim for a solution that runs in O(n log n) or better.",
      ],
    },
    { kind: "label", text: "Signature" },
    { kind: "signature" },
    { kind: "label", text: "Examples" },
    {
      kind: "examples",
      items: [
        {
          label: "Example 1",
          fields: [
            {
              name: "words",
              value: '["the", "sky", "is", "blue", "the", "sun", "is", "sunny", "the"]',
            },
            { name: "k", value: "2" },
            { name: "output", value: '["the", "is"]', emphasis: true },
          ],
          note: '"the" appears 3 times, "is" twice. Everything else appears once.',
        },
        {
          label: "Example 2",
          fields: [
            { name: "words", value: '["b", "a", "c", "b", "a", "c"]' },
            { name: "k", value: "3" },
            { name: "output", value: '["a", "b", "c"]', emphasis: true },
          ],
          note: "All three tie at 2, so alphabetical order decides.",
        },
      ],
    },
    { kind: "label", text: "Constraints" },
    {
      kind: "list",
      items: [
        [{ code: "1 ≤ len(words) ≤ 10⁵" }],
        [{ code: "1 ≤ k ≤" }, " the number of distinct words"],
        ["Letters only, and the comparison is case-sensitive"],
      ],
    },
  ],
  solutionNote: [
    "Sort by a tuple so the tiebreak is part of the key: negative count first, then the word itself. Sorting is O(n log n); a heap gets you O(n log k) when ",
    { code: "k" },
    " is small.",
  ],
  languages: [
    {
      id: "python",
      label: "Python 3.12",
      shortLabel: "Python",
      signature: "def top_k_words(words: list[str], k: int) -> list[str]",
      starterCode: `from collections import Counter


def top_k_words(words: list[str], k: int) -> list[str]:
    counts = Counter(words)
    # Sort so that the most frequent come first, and ties go alphabetically.
    return []
`,
      solutionCode: `from collections import Counter


def top_k_words(words: list[str], k: int) -> list[str]:
    counts = Counter(words)
    ranked = sorted(counts, key=lambda w: (-counts[w], w))
    return ranked[:k]
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          description: "Counts decide the order.",
          code: `words = ["the", "sky", "is", "blue", "the", "sun", "is", "sunny", "the"]
assert top_k_words(words, 2) == ["the", "is"], f"got {top_k_words(words, 2)}"`,
        },
        {
          id: "ties",
          name: "Ties resolve alphabetically",
          description: "Every word appears twice, so only the spelling breaks the tie.",
          code: `assert top_k_words(["b", "a", "c", "b", "a", "c"], 3) == ["a", "b", "c"], \\
    f'got {top_k_words(["b", "a", "c", "b", "a", "c"], 3)}'`,
        },
        {
          id: "k-one",
          name: "k = 1 returns a single word",
          code: `assert top_k_words(["x", "y", "x"], 1) == ["x"]`,
        },
        {
          id: "all-distinct",
          name: "k equal to the number of distinct words",
          description: "Returns every word, still in ranked order.",
          code: `assert top_k_words(["pear", "apple", "fig"], 3) == ["apple", "fig", "pear"]`,
        },
        {
          id: "case-sensitive",
          name: "Comparison is case-sensitive",
          description: '"Apple" and "apple" are different words.',
          code: `assert top_k_words(["Apple", "apple", "apple"], 1) == ["apple"]`,
        },
        {
          id: "large",
          name: "Handles a large input",
          description: "10,000 words, still ordered correctly.",
          code: `big = ["a"] * 5000 + ["b"] * 3000 + ["c"] * 2000
assert top_k_words(big, 2) == ["a", "b"]`,
        },
      ],
    },
    {
      id: "javascript",
      label: "JavaScript · Node",
      shortLabel: "JavaScript",
      signature: jsSignature("function topKWords(words: string[], k: number): string[]"),
      starterCode: `function topKWords(words, k) {
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  // Sort so that the most frequent come first, and ties go alphabetically.
  return [];
}
`,
      solutionCode: `function topKWords(words, k) {
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.keys()]
    .sort((a, b) => counts.get(b) - counts.get(a) || (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, k);
}
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          description: "Counts decide the order.",
          code: `const words = ["the", "sky", "is", "blue", "the", "sun", "is", "sunny", "the"];
const got = topKWords(words, 2);
if (JSON.stringify(got) !== JSON.stringify(["the", "is"])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "ties",
          name: "Ties resolve alphabetically",
          description: "Every word appears twice, so only the spelling breaks the tie.",
          code: `const got = topKWords(["b", "a", "c", "b", "a", "c"], 3);
if (JSON.stringify(got) !== JSON.stringify(["a", "b", "c"])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "k-one",
          name: "k = 1 returns a single word",
          code: `const got = topKWords(["x", "y", "x"], 1);
if (JSON.stringify(got) !== JSON.stringify(["x"])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "all-distinct",
          name: "k equal to the number of distinct words",
          description: "Returns every word, still in ranked order.",
          code: `const got = topKWords(["pear", "apple", "fig"], 3);
if (JSON.stringify(got) !== JSON.stringify(["apple", "fig", "pear"])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "case-sensitive",
          name: "Comparison is case-sensitive",
          description: '"Apple" and "apple" are different words.',
          code: `const got = topKWords(["Apple", "apple", "apple"], 1);
if (JSON.stringify(got) !== JSON.stringify(["apple"])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "large",
          name: "Handles a large input",
          description: "10,000 words, still ordered correctly.",
          code: `const big = [].concat(
  Array(5000).fill("a"), Array(3000).fill("b"), Array(2000).fill("c"),
);
const got = topKWords(big, 2);
if (JSON.stringify(got) !== JSON.stringify(["a", "b"])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
      ],
    },
  ],
};
