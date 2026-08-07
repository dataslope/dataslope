// Guards what `check:challenges` believes a challenge card's reference
// solution is (scripts/lib/mdx-blocks.mjs) and how it lays that solution out
// on disk before running it (the `stage` half of scripts/lib/pyodide-runner.mjs).
//
// Both halves used to read only the *entry* file, and both failures were
// silent by construction:
//
//   • `solution` came from `entry.solutionCode`. Every multi-file card in
//     python-basics puts a fixed driver in main.py ("Do not edit main.py") and
//     the actual exercise in a sibling module, so ten fully-solved cards
//     reported as having nothing to verify and were skipped.
//   • `stage()` wrote siblings from `starterCode`, i.e. the learner's blanks.
//     A card solved across files would have been graded against its own
//     stubs, passing only when the tests never reached the sibling.
//
// A card that is skipped and a card that passes look identical in a green
// sweep, which is why these are pinned here rather than left to the sweep
// itself (it needs a 30s Pyodide boot and cannot run in unit CI).
import { describe, expect, it } from "vitest";

import { extractChallengeCards, parseFiles } from "../scripts/lib/mdx-blocks.mjs";

interface CardFile {
  filename: string;
  initCode: string;
  starterCode: string;
  solutionCode: string;
  solutionSource?: string;
}

// A card that failed to parse carries only the first three fields, so the rest
// are optional here rather than asserted away at each use.
interface Card {
  file: string;
  line: number;
  title: string;
  entry?: string;
  files?: CardFile[];
  tests?: { id: string }[];
  solution?: string | null;
  unparsable?: string;
}

/** A card the extractor could read, i.e. everything but `unparsable`. */
type ParsedCard = Card & Required<Pick<Card, "entry" | "files" | "tests">>;

const cards: Card[] = extractChallengeCards(undefined, "python");

/** Locate one card by file suffix and title, failing loudly rather than
 *  returning undefined and turning every later assertion into a no-op. */
function findCard(fileSuffix: string, title: string): ParsedCard {
  const card = cards.find((c) => c.file.endsWith(fileSuffix) && c.title === title);
  if (!card) throw new Error(`no challenge card "${title}" in ${fileSuffix}`);
  if (card.unparsable) throw new Error(`card "${title}" did not parse: ${card.unparsable}`);
  return card as ParsedCard;
}

/** One card's file, by name. */
function fileOf(card: ParsedCard, filename: string): CardFile {
  const f = card.files.find((x) => x.filename === filename);
  if (!f) throw new Error(`no file ${filename} in "${card.title}"`);
  return f;
}

/** The write `stage()` performs for each non-entry file. Kept in step with
 *  pyodide-runner.mjs by `still joins initCode when a file has some` below. */
function stagedBody(f: CardFile): string {
  const body = f.solutionSource ?? f.starterCode;
  return f.initCode ? `${f.initCode}\n${body}` : body;
}

describe("challenge card solution extraction", () => {
  it("finds a solution for every python card", () => {
    const unsolved = cards.filter((c) => !c.unparsable && !c.solution);
    // Every card in content/ supplies a solution on some file. A new card that
    // genuinely has none should be added deliberately, not discovered as a
    // silent gap in the sweep months later.
    expect(unsolved.map((c) => `${c.file}:${c.line}`)).toEqual([]);
  });

  it("treats a card as solved when only a sibling file carries the solution", () => {
    const card = findCard("python-basics/classes.mdx", "Shopping cart with products");
    // The shape that used to read as unsolved: driver entry, solutions on the
    // two modules the instructions actually ask the learner to write.
    expect(card.entry).toBe("main.py");
    expect(fileOf(card, "main.py").solutionCode).toBe("");
    expect(card.solution).not.toBeNull();
    for (const name of ["product.py", "cart.py"]) {
      expect(fileOf(card, name).solutionCode).not.toBe("");
    }
  });

  it("runs the entry's own buffer when the entry has no solution of its own", () => {
    const card = findCard("python-basics/modules.mdx", "Implement a stats helper across files");
    // The driver is not something the learner edits, so pressing Solution
    // leaves it exactly as shipped.
    expect(card.solution).toBe(fileOf(card, card.entry).starterCode);
  });

  it("stages every sibling from its solution, not its starter", () => {
    const card = findCard("python-basics/inheritance.mdx", "Polymorphic animals");
    const sibling = fileOf(card, "animals.py");
    expect(sibling.solutionCode).not.toBe("");
    expect(sibling.solutionCode).not.toBe(sibling.starterCode);
    // What lands in the Pyodide FS is the solved module...
    expect(stagedBody(sibling)).toBe(sibling.solutionCode);
    // ...and specifically not the stub with `# your code here` still in it.
    expect(stagedBody(sibling)).not.toContain("your code here");
  });

  it("keeps a file without a solution at its starter", () => {
    const csv = fileOf(findCard("python-basics/files.mdx", "Parse a CSV file"), "sales.csv");
    expect(csv.solutionCode).toBe("");
    expect(stagedBody(csv)).toBe(csv.starterCode);
  });

  it("does not prepend a blank line to a file that has no initCode", () => {
    // A leading newline is invisible in a .py sibling and destroys a data one:
    // it pushed sales.csv's header off line 1, so csv.DictReader came back
    // with one empty field name and a correct solution raised
    // KeyError: 'product'.
    const csv = fileOf(findCard("python-basics/files.mdx", "Parse a CSV file"), "sales.csv");
    expect(csv.initCode).toBe("");
    expect(stagedBody(csv).startsWith("\n")).toBe(false);
    expect(stagedBody(csv).split("\n")[0]).toBe("product,amount");
  });

  it("still joins initCode when a file has some", () => {
    const withInit = { filename: "m.py", initCode: "X = 1", starterCode: "print(X)", solutionCode: "" };
    expect(stagedBody(withInit)).toBe("X = 1\nprint(X)");
  });

  it("sets solutionSource on every file", () => {
    for (const card of cards) {
      if (card.unparsable || !card.files) continue;
      for (const f of card.files) {
        expect(f.solutionSource, `${card.file}:${card.line} ${f.filename}`).toBe(
          f.solutionCode || f.starterCode,
        );
      }
    }
  });
});

describe("parseFiles", () => {
  it("reads solutionCode per file, not just for the first", () => {
    const block = `files={[
      { filename: "a.py", starterCode: \`pass\` },
      { filename: "b.py", starterCode: \`pass\`, solutionCode: \`answer = 2\` },
    ]}`;
    const files = parseFiles(block) as CardFile[];
    expect(files.map((f) => f.filename)).toEqual(["a.py", "b.py"]);
    expect(files[0].solutionCode).toBe("");
    expect(files[1].solutionCode).toBe("answer = 2");
  });
});
