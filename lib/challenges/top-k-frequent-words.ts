/**
 * "Top K Frequent Words" — the single-step challenge.
 *
 * No step rail; instead a language picker over one editor (Python and
 * JavaScript), and stdin/stdout output rather than a result table. Authored
 * as attempted, with one failing check on the alphabetical tiebreak — the
 * mistake the problem is actually about.
 */

import type { Challenge } from "./types";

export const TOP_K_FREQUENT_WORDS: Challenge = {
  slug: "top-k-frequent-words",
  title: "Top K Frequent Words",
  difficulty: "Intermediate",
  catalog: {
    topic: "Hash maps",
    langs: ["python", "javascript"],
    // The workspace opens on "Attempted · 2 submissions" with a failing
    // check, so the row cannot say Solved the way the list mock did.
    status: "attempted",
    acceptance: 81,
  },
  languageLabel: "Python",
  description:
    "Return the k most frequent words, most frequent first, breaking ties alphabetically. A single-step problem with a choice of language.",
  submitLabel: "Submit",
  steps: [],
  instructions: [
    { kind: "status", text: "Attempted · 2 submissions" },
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
        [{ code: "1 ≤ len(words[i]) ≤ 20" }, ", lowercase and uppercase letters only"],
        [{ code: "1 ≤ k ≤" }, " number of distinct words"],
        ["Time limit 1 s, memory limit 256 MB"],
      ],
    },
  ],
  languages: [
    {
      id: "python",
      label: "Python 3.12",
      shortLabel: "Python",
      runMeta: "python 3.12 · 0.08s · exit 0",
      runTime: "0.08s",
      signature: "def top_k_words(words: list[str], k: int) -> list[str]",
      source: `from collections import Counter

def top_k_words(words: list[str], k: int) -> list[str]:
    counts = Counter(words)
    ranked = sorted(counts.items(), key=lambda kv: -kv[1])
    return [w for w, _ in ranked[:k]]`,
    },
    {
      id: "javascript",
      label: "JavaScript · Node 20",
      shortLabel: "JavaScript",
      runMeta: "node 20 · 0.05s · exit 0",
      runTime: "0.05s",
      signature: "function topKWords(words: string[], k: number): string[]",
      source: `function topKWords(words, k) {
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([w]) => w);
}`,
    },
  ],
  schema: [],
  output: {
    kind: "stdio",
    stdinLabel: "stdin · example 1",
    stdin: `words = ["the", "sky", "is", "blue", "the",
         "sun", "is", "sunny", "the"]
k = 2`,
    stdout: '["the", "is"]',
    matchesExpected: true,
    footer: ["exit 0", "9.2 MB"],
  },
  tests: [
    {
      name: "Example 1",
      detail: 'words = ["the", "sky", "is", "blue", "the", "sun", "is", "sunny", "the"], k = 2',
      pass: true,
    },
    {
      name: "k equals number of distinct words",
      detail: "1,000 distinct words, k = 1000",
      pass: true,
    },
    {
      name: "Ties resolve alphabetically",
      detail: 'expected ["a", "b", "c"]',
      got: 'got      ["b", "a", "c"]',
      pass: false,
    },
    {
      name: "Large input within time limit",
      detail: "100,000 words · 0.31s of 1.00s",
      pass: true,
    },
  ],
  testsSummary: "3 of 4 test cases passed",
  testsSubtitle: "Not accepted yet",
  testsBadge: "3/4",
  solution: {
    spans: [
      "Sort by a tuple so the tiebreak is part of the key: negative count first, then the word itself. Sorting is O(n log n); a heap gets you O(n log k) if ",
      { code: "k" },
      " is small.",
    ],
    label: "Reference solution · Python",
    language: "python",
    source: `def top_k_words(words, k):
    counts = Counter(words)
    ranked = sorted(counts, key=lambda w: (-counts[w], w))
    return ranked[:k]`,
  },
  submissions: [
    { result: "Wrong answer", ok: false, lang: "Python 3.12", runtime: "0.31s", when: "2 min ago" },
    { result: "Runtime error", ok: false, lang: "Python 3.12", runtime: "—", when: "9 min ago" },
  ],
  submissionColumns: ["result", "lang", "runtime", "when"],
  keyStrip: [],
};
