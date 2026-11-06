import type { CharacterAlignment } from "./types";

/**
 * How the narrator says an initialism (or a technical word, like RESTful or
 * deque) that people say as a word. A script
 * writes the initialism as everyone writes it (SQL, DAG), and
 * scripts/narrate.mjs sends this spoken form instead, then maps the voice's
 * character timing back onto the written text. So cues, captions and the
 * screen keep "SQL" while the voice says "sequel".
 *
 * Every initialism not listed here is read letter by letter, which is how
 * people say most of them (API, CSV, CTE, LLM). Written in plain caps, the
 * voice already does that (acronyms.test.ts); this table is only for the
 * ones said as a word. Measured on the committed narration, before this
 * table: SQL took 0.64 s (letters), and "sequel", written out, 0.40 s.
 *
 * Changing an entry changes what every beat containing it says, so
 * `npm run narrate -- <video>` re-voices exactly those beats and nothing
 * else (alignment.json records each beat's `spoken` text). Plan and
 * measurements: agent-outputs/20261105-1200-narration-acronym-redub-plan.md.
 */
export const SAY: Readonly<Record<string, string>> = {
  SQL: "sequel",
  DAG: "dag",
  DAGs: "dags",
  OLAP: "oh-lap",
  SKU: "skew",
  SKUs: "skews",
  CUPED: "cue-ped",
  SUTVA: "sut-vuh",
  // The Backend / Software Engineer series (2026-11-06). JSON and ACID were
  // already said in llm-tokens and de-warehousing; those beats re-voice only
  // if those videos are narrated again.
  REST: "rest",
  RESTful: "restful",
  JSON: "jay-son",
  OAuth: "oh-auth",
  HATEOAS: "hate-ee-oss",
  NoSQL: "no-sequel",
  ACID: "acid",
  CAP: "cap",
  PACELC: "pass-elk",
  GIL: "gill",
  SOLID: "solid",
  YAGNI: "yag-nee",
  OWASP: "oh-wasp",
  METR: "meter",
  ASCII: "ask-ee",
  XOR: "ex-or",
  deque: "deck",
};

/** Longest first, so DAGs is matched before DAG. A key matches as a whole
 *  token: no letter or digit on either side, so "MySQL" and "S-Q-L" are left
 *  alone while "Spark SQL" and "SQL's" are said. */
const KEYS = Object.keys(SAY).sort((a, b) => b.length - a.length);
const TOKEN = new RegExp(`(?<![A-Za-z0-9])(${KEYS.join("|")})(?![A-Za-z0-9])`, "g");

/** A stretch of the written text replaced in the spoken one. */
type Swap = { written: [number, number]; spoken: [number, number] };

/** The text the voice is sent for `written`, and where each replacement
 *  sits in both. A text with nothing to replace comes back unchanged. */
export function say(written: string): { text: string; swaps: Swap[] } {
  const swaps: Swap[] = [];
  let text = "";
  let at = 0;
  for (const m of written.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    text += written.slice(at, start);
    // A word that opens a sentence is capitalized, as written prose would
    // have it ("Sequel fluency"), so the voice reads the sentence's start.
    const opens = /(^|[.?!]\s+)$/.test(written.slice(0, start));
    const word = SAY[m[1]];
    const spoken = opens ? word[0].toUpperCase() + word.slice(1) : word;
    swaps.push({ written: [start, start + m[1].length], spoken: [text.length, text.length + spoken.length] });
    text += spoken;
    at = start + m[1].length;
  }
  text += written.slice(at);
  return { text, swaps };
}

/** What `written` is said as: say(written).text. */
export const spokenText = (written: string) => say(written).text;

/**
 * Character timing for the voice's spoken text, laid back onto the written
 * text it was made from. A character outside any replacement keeps its own
 * times; every character of a replaced initialism takes the span of the
 * whole word that replaced it, so a cue on "SQL" starts where "sequel" does
 * and ends where it ends.
 */
export function toWritten(written: string, spoken: CharacterAlignment): CharacterAlignment {
  const { text, swaps } = say(written);
  if (spoken.characters.join("") !== text) {
    throw new Error(`alignment spells "${spoken.characters.join("")}", not the spoken form "${text}"`);
  }
  const starts: number[] = [];
  const ends: number[] = [];
  let s = 0; // index in the spoken text
  let w = 0; // index in the written text
  for (const swap of [...swaps, null]) {
    const until = swap ? swap.written[0] : written.length;
    for (; w < until; w++, s++) {
      starts.push(spoken.character_start_times_seconds[s]);
      ends.push(spoken.character_end_times_seconds[s]);
    }
    if (!swap) break;
    const [a, b] = swap.spoken;
    for (; w < swap.written[1]; w++) {
      starts.push(spoken.character_start_times_seconds[a]);
      ends.push(spoken.character_end_times_seconds[b - 1]);
    }
    s = b;
  }
  return { characters: [...written], character_start_times_seconds: starts, character_end_times_seconds: ends };
}
