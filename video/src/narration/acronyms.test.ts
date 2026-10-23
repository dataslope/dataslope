// Run with `npm test` (node --test; Node strips the types).
//
// How an initialism is written decides how the voice says it. Measured on
// Drew (eleven_v4_turbo) with pitch tracking and speech-to-text, 2026-10-22:
//
// - Letter-spaced ("C L T", "P C A") is read as separate letters, and the
//   voice puts its own stress on one of them: PCA swung 10.3 semitones spaced
//   against 4.2 plain, ATT 10.2 against 3.6, at the same speed. Plain caps is
//   read as one unit, and speech-to-text confirms every plain form in these
//   scripts is still spelled out, not read as a word (ATE is not "eight").
//   "A B test" and "A A test" are the exceptions: spaced, they were the
//   quickest form, and "A/B" is read "A slash B".
// - A sentence that opens "A SQL …" or "A CTE …" has its article read as the
//   letter "ay" (0.16 s, against 0.04 s for the same "a" mid-sentence).
//   Reword the sentence instead.
//
// A compound like ROC-AUC is slow in every written form (1.8 to 2.0 s, with a
// pitch accent on the R), so the narration respells it phonetically
// ("ar-oh-see ay-you-see", 1.3 s). Captions are off in the editorial videos,
// so a respelling never reaches the screen. That case is not checked here.
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { NarrationScript } from "./types.ts";

const VIDEOS = join(dirname(fileURLToPath(import.meta.url)), "..", "videos");

/** Two or more capitals with a space between each: "C L T". */
const SPACED = /\b(?:[A-Z] )+[A-Z]\b(?![a-z'])/g;
/** Spaced on purpose, see above. */
const SPACED_OK = new Set(["A B", "A A"]);
/** A sentence opening with the article before an initialism: "A SQL …". */
const OPENING_A = /(?:^|[.?!:]\s+)A ((?:[A-Z]{2,}|[A-Z][- ][A-Z])\S*)/g;
/** Capitals that are said as a word, so "A LEFT join" is read "a left join". */
const SAID_AS_WORDS = new Set(["LEFT", "RIGHT", "INNER", "OUTER", "FULL", "CROSS", "JOIN", "WHERE", "HAVING", "SELECT", "CASE", "NULL", "WITH", "GROUP", "ORDER", "UNION", "COUNT", "SUM", "DISTINCT"]);

/** Voiced before this rule, and left as they are. */
const KNOWN: Record<string, string> = {
  // A country code, spelled out letter by letter on purpose.
  "db-keys/kinds": "J P",
  // "A Q-Q plot", in a video voiced before the rule.
  "distributions/qq": "A Q-Q",
};

/** A hit inside a known exception, matched either way round. */
function known(where: string, hit: string) {
  const k = KNOWN[where];
  return k !== undefined && (k.startsWith(hit) || hit.startsWith(k));
}

async function beats() {
  const out: { where: string; text: string }[] = [];
  for (const video of readdirSync(VIDEOS).sort()) {
    const { script } = (await import(pathToFileURL(join(VIDEOS, video, "script.ts")).href)) as {
      script: NarrationScript;
    };
    for (const beat of script.beats) out.push({ where: `${video}/${beat.id}`, text: beat.text });
  }
  return out;
}

test("initialisms are written in plain caps, not letter by letter", async () => {
  const bad: string[] = [];
  for (const { where, text } of await beats()) {
    for (const [hit] of text.matchAll(SPACED)) {
      if (!SPACED_OK.has(hit) && !known(where, hit)) bad.push(`${where}: "${hit}"`);
    }
  }
  assert.deepEqual(bad, [], "write these as plain caps (CLT, not C L T)");
});

test("no sentence opens with the article before an initialism", async () => {
  const bad: string[] = [];
  for (const { where, text } of await beats()) {
    for (const m of text.matchAll(OPENING_A)) {
      const word = m[1].match(/^[A-Z]+/)?.[0] ?? "";
      if (!SAID_AS_WORDS.has(word) && !known(where, `A ${m[1]}`)) bad.push(`${where}: "A ${m[1]}"`);
    }
  }
  assert.deepEqual(bad, [], "reword these: the voice reads the opening A as the letter");
});
