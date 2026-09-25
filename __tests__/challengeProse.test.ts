/**
 * The prose rules, applied to challenges.
 *
 * `scripts/check-prose.mjs` holds lesson prose to the house style (no em
 * dashes, no filler phrases) by scanning `content/`, `app/` and `charts/`.
 * Challenges are authored in `lib/challenges`, which it never reads, and the
 * first hundred shipped with 169 em dashes in text a learner reads.
 *
 * This walks what a learner actually sees rather than the source: titles,
 * descriptions, prompts, examples, constraints, solution notes, check names
 * and descriptions, step titles, and the starter and reference code (whose
 * comments are shown in the editor and the Solution tab). Source comments
 * are developer-facing and stay out of it. On top of the repo-wide rules, it
 * bans the rest of the punctuation that marks text as machine-written: the
 * ellipsis character, arrows, curly quotes, en dashes and the typographic
 * minus, each of which has a plain spelling.
 */

import { describe, expect, it } from "vitest";
import {
  getChallenge,
  getChallengeSlugs,
  type InstructionBlock,
  type Span,
} from "@/lib/challenges";
import { AI_FILLER } from "../scripts/check-prose.mjs";

const BANNED: [RegExp, string][] = [
  [/[—―]/, "em dash: use a comma, colon, semicolon, parentheses or a full stop"],
  [/–/, "en dash: use a hyphen, or `to` for a range"],
  [/…/, "ellipsis character: write `...`"],
  [/[→←⇒⇐↔]/, "arrow: say it in words"],
  [/[“”‘’]/, "curly quote: use a straight quote"],
  [/−/, "typographic minus: use `-`"],
  [/·/, "middle dot: use `×` for multiplication"],
];

function spanText(spans: Span[] = []): string {
  return spans.map((s) => (typeof s === "string" ? s : s.code)).join("");
}

function blockTexts(blocks: InstructionBlock[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case "heading":
      case "label":
        out.push(b.text);
        break;
      case "prose":
        out.push(spanText(b.spans));
        break;
      case "list":
        for (const item of b.items) out.push(spanText(item));
        break;
      case "code":
        out.push(b.source);
        break;
      case "table":
        for (const row of b.rows) out.push(...Object.values(row));
        break;
      case "columns":
        for (const row of b.rows) out.push(row.name, row.type);
        break;
      case "examples":
        for (const e of b.items) {
          out.push(e.label, e.note ?? "");
          for (const f of e.fields) out.push(f.name, f.value, ...Object.values(f.byLanguage ?? {}));
        }
        break;
      case "signature":
        break;
    }
  }
  return out;
}

/** Every string a learner reads on this challenge, labelled by where it is. */
function learnerText(slug: string): [string, string][] {
  const c = getChallenge(slug)!;
  const out: [string, string][] = [
    ["title", c.title],
    ["description", c.description],
    ["topic", c.catalog.topic],
    ["solution note", spanText(c.solutionNote)],
    ...blockTexts(c.instructions).map((t): [string, string] => ["instructions", t]),
  ];
  for (const s of c.steps) {
    out.push(["step title", s.title], ["step short title", s.short]);
    out.push(["step note", spanText(s.solutionNote)]);
    for (const t of blockTexts(s.instructions)) out.push([`step ${s.n}`, t]);
  }
  const tasks = c.steps.length ? c.steps : c.languages;
  for (const task of tasks) {
    out.push(["starter", task.starterCode], ["solution", task.solutionCode]);
    for (const t of task.tests) {
      out.push(["check name", t.name]);
      if (t.description) out.push(["check description", t.description]);
    }
  }
  for (const l of c.languages) if (l.signature) out.push(["signature", l.signature]);
  return out;
}

describe("challenge prose", () => {
  const slugs = getChallengeSlugs();

  it("uses none of the punctuation that reads as machine-written", () => {
    const found: string[] = [];
    for (const slug of slugs) {
      for (const [where, text] of learnerText(slug)) {
        for (const [re, why] of BANNED) {
          const m = re.exec(text);
          if (!m) continue;
          const at = m.index;
          found.push(`${slug} · ${where}: ${why}\n    ...${text.slice(Math.max(0, at - 50), at + 50).replace(/\n/g, " ")}...`);
        }
      }
    }
    expect(found, `${found.length} found:\n${found.join("\n")}`).toEqual([]);
  });

  it("uses none of the filler phrases the lesson linter bans", () => {
    const found: string[] = [];
    for (const slug of slugs) {
      for (const [where, text] of learnerText(slug)) {
        for (const [re, label] of AI_FILLER as [RegExp, string][]) {
          if (re.test(text)) found.push(`${slug} · ${where}: "${label}"`);
        }
      }
    }
    expect(found, found.join("\n")).toEqual([]);
  });
});
