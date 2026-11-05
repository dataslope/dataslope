// Run with `npm test` (node --test; Node strips the types).
//
// The lexicon (lexicon.ts) says some initialisms as words: the script writes
// SQL, the voice is sent "sequel", and the timing is laid back onto "SQL".
// These check the substitution, the mapping back, and, from the committed
// audio's own timing, that the voice really says each one as a word.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { SAY, say, spokenText, toWritten } from "./lexicon.ts";
import type { NarrationAlignmentFile } from "./types.ts";

const NARRATION = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "narration");

test("an initialism is said as a word only as a whole token", () => {
  assert.equal(spokenText("Spark SQL's planner"), "Spark sequel's planner");
  assert.equal(spokenText("A DAG, then two DAGs."), "A dag, then two dags.");
  // Inside a word, or spelled out on purpose, it is left alone.
  assert.equal(spokenText("MySQL and S-Q-L and SQLAlchemy"), "MySQL and S-Q-L and SQLAlchemy");
  assert.equal(spokenText("No initialism here."), "No initialism here.");
  // Opening a sentence, the word is capitalized like any other.
  assert.equal(spokenText("SQL fluency. Then SQL again. DAG first"), "Sequel fluency. Then sequel again. Dag first");
});

test("every lexicon key is a plain-caps initialism, said in lower case as a word", () => {
  for (const [written, spoken] of Object.entries(SAY)) {
    assert.match(written, /^[A-Z]{2,}s?$/, written);
    // Lower case is what makes the voice read it as a word, even when the
    // letters are the same ("dag" for DAG).
    assert.match(spoken, /^[a-z][a-z' -]*$/, `${written}: "${spoken}"`);
  }
});

test("the voice's timing is laid back onto the written text", () => {
  const written = "Write SQL, then a DAG.";
  const { text } = say(written);
  // A fake alignment: character i of the spoken text runs from i to i + 1 s.
  const spoken = {
    characters: [...text],
    character_start_times_seconds: [...text].map((_, i) => i),
    character_end_times_seconds: [...text].map((_, i) => i + 1),
  };
  const w = toWritten(written, spoken);
  assert.equal(w.characters.join(""), written);
  assert.equal(w.character_start_times_seconds.length, written.length);
  // "SQL" (written 6-8) takes the span of "sequel" (spoken 6-11).
  for (const i of [6, 7, 8]) {
    assert.equal(w.character_start_times_seconds[i], 6);
    assert.equal(w.character_end_times_seconds[i], 12);
  }
  // The text after it is shifted back by the three letters "sequel" adds.
  const comma = written.indexOf(",");
  assert.equal(w.character_start_times_seconds[comma], text.indexOf(","));
  // "DAG" takes the span of "dag".
  const dag = written.indexOf("DAG");
  assert.equal(w.character_start_times_seconds[dag], text.indexOf("dag"));
  assert.equal(w.character_end_times_seconds[dag + 2], text.indexOf("dag") + 3);
  assert.throws(() => toWritten("SQL", { characters: [..."SQL"], character_start_times_seconds: [0, 1, 2], character_end_times_seconds: [1, 2, 3] }));
});

// Letters read one at a time took 0.21 to 0.27 s each in the committed
// narration (SQL 0.64 s, DAG 0.72 s, OLAP 0.96 s); written as words they
// took about half that ("sequel" 0.40 s). A beat voiced through the lexicon
// whose initialisms run at letter speed was spelled out after all.
const LETTER_SPEED = 0.18;

test("initialisms voiced through the lexicon are said as words, by their timing", () => {
  const durations = new Map<string, number[]>();
  for (const dir of existsSync(NARRATION) ? readdirSync(NARRATION) : []) {
    const file = join(NARRATION, dir, "alignment.json");
    if (!existsSync(file)) continue;
    const { beats } = JSON.parse(readFileSync(file, "utf8")) as NarrationAlignmentFile;
    for (const entry of Object.values(beats)) {
      if (!entry.spoken) continue;
      for (const { written: [a, b] } of say(entry.text).swaps) {
        const key = entry.text.slice(a, b);
        const d = entry.alignment.character_end_times_seconds[b - 1] - entry.alignment.character_start_times_seconds[a];
        durations.set(key, [...(durations.get(key) ?? []), d]);
      }
    }
  }
  for (const [key, ds] of durations) {
    const sorted = [...ds].sort((x, y) => x - y);
    const median = sorted[sorted.length >> 1];
    const letters = key.replace(/s$/, "").length;
    assert.ok(median < letters * LETTER_SPEED, `${key}: median ${median.toFixed(2)} s over ${ds.length}, letter speed is ${(letters * LETTER_SPEED).toFixed(2)} s`);
  }
});
