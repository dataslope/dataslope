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
 * Needs a Node that strips TypeScript types (22.18 or later).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const VIDEOS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "videos");
/** `.word("beat", "phrase")`, optionally followed by an options object, or the
 *  rapid rounds' `c.w("beat", "phrase")` shorthand for it. */
const CUE = /\.(?:word|w)\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*(?:,\s*\{([^}]*)\})?/g;

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
      for (const m of src.matchAll(CUE)) {
        const [, beat, phrase, options = ""] = m;
        const at = { file: `${folder}/${file}`, line: src.slice(0, m.index).split("\n").length, beat, phrase };
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
