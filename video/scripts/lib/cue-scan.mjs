/**
 * Finds the word cues in every video's scenes that a beat says more than
 * once: `n.word("sum", "five")` in a beat that says "five" twice, with no
 * `nth`. The cue silently takes the first, and the first is not always the
 * one meant: Probability's "a hundred" landed on "Walk a hundred thousand"
 * three seconds before the "A hundred" its animation was for, and only
 * check:motion caught it, by accident. With `nth` given (1 included) the
 * choice is on the page.
 *
 * Reads the cues as written (literal beat ids and phrases; a cue built from
 * a variable is not seen) and the beats through the same buildTimeline the
 * videos use, so a word splits here exactly as it does on screen. Also
 * reports a literal cue whose beat does not exist or does not say its phrase,
 * which would throw in the Studio.
 *
 * A cue made through a small wrapper is read too: `const w = (p) =>
 * n.word("ai", p)` makes every `w("phrase")` a cue on "ai", and `const w =
 * (b, p) => n.word(b, p)` makes `w("beat", "phrase")` one. The Data
 * Scientist overview hid 34 of its 57 cues behind a wrapper like that before
 * the scan knew them.
 *
 * Needs a Node that strips TypeScript types (22.18 or later).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const VIDEOS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "videos");
/** `.word("beat", "phrase")`, optionally followed by an options object, or the
 *  rapid rounds' `c.w("beat", "phrase")` shorthand for it. */
const CUE = /\.(?:word|w)\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*(?:,\s*\{([^}]*)\})?/g;

const TYPE = String.raw`(?:\s*:\s*[^,()=]+)?`;
/** `const w = (b, p) => n.word(b, p)`: a wrapper whose calls name the beat and the phrase. */
const BOTH = new RegExp(String.raw`(?:const|let)\s+(\w+)${TYPE}\s*=\s*\(\s*(\w+)${TYPE}\s*,\s*(\w+)${TYPE}\s*\)${TYPE}\s*=>\s*\w+\.word\(\s*\2\s*,\s*\3\s*[,)]`, "g");
/** `const w = (p) => n.word("ai", p)`: a wrapper whose calls name only the phrase. */
const PHRASE = new RegExp(String.raw`(?:const|let)\s+(\w+)${TYPE}\s*=\s*\(\s*(\w+)${TYPE}\s*\)${TYPE}\s*=>\s*\w+\.word\(\s*"([^"]+)"\s*,\s*\2\s*[,)]`, "g");

/** The cues in one scene file's source, as { index, beat, phrase, options }:
 *  every literal `.word()` and `c.w()`, and every call of a wrapper above. */
export function cuesIn(src) {
  const cues = [...src.matchAll(CUE)].map((m) => ({ index: m.index, beat: m[1], phrase: m[2], options: m[3] ?? "" }));
  const call = (name, args) => new RegExp(String.raw`(?<![\w.])${name}\(${args}\s*(?:,\s*\{([^}]*)\})?`, "g");
  for (const [, name] of src.matchAll(BOTH)) {
    for (const m of src.matchAll(call(name, String.raw`\s*"([^"]+)"\s*,\s*"([^"]+)"`))) {
      cues.push({ index: m.index, beat: m[1], phrase: m[2], options: m[3] ?? "" });
    }
  }
  for (const [, name, , beat] of src.matchAll(PHRASE)) {
    for (const m of src.matchAll(call(name, String.raw`\s*"([^"]+)"`))) cues.push({ index: m.index, beat, phrase: m[1], options: m[2] ?? "" });
  }
  return cues.sort((a, b) => a.index - b.index);
}

/** Returns { ambiguous, missing }, each a list of { file, line, beat, phrase, times? }. */
export async function scanCues(videos = VIDEOS) {
  const { buildTimeline, phraseStarts } = await import(pathToFileURL(path.join(videos, "..", "narration", "timeline.ts")).href);
  const ambiguous = [];
  const missing = [];
  for (const folder of readdirSync(videos)) {
    const scriptFile = path.join(videos, folder, "script.ts");
    if (!existsSync(scriptFile)) continue;
    const { script } = await import(pathToFileURL(scriptFile).href);
    if (!script?.beats?.length) continue;
    const beats = new Map(buildTimeline(script, null).beats.map((b) => [b.id, b]));
    for (const file of readdirSync(path.join(videos, folder)).filter((f) => f.endsWith(".tsx"))) {
      const src = readFileSync(path.join(videos, folder, file), "utf8");
      for (const { index, beat, phrase, options } of cuesIn(src)) {
        const at = { file: `${folder}/${file}`, line: src.slice(0, index).split("\n").length, beat, phrase };
        const b = beats.get(beat);
        const times = b ? phraseStarts(b.words, phrase).length : 0;
        const nth = options.match(/\bnth:\s*(\d+)/);
        if (!times || (nth && Number(nth[1]) > times)) missing.push(at);
        else if (times > 1 && !/\bnth\b/.test(options)) ambiguous.push({ ...at, times });
      }
    }
  }
  return { ambiguous, missing };
}
