import m from "./measurements.json";

// Every listing, output and number the video shows. Run, not typed:
// measure.py compiles Equality.java with javac, runs it with java (OpenJDK
// 21.0.12.1), and measurements.json is what it printed, imported here as it
// is. The listings are the lines between the source's "figN:begin" and
// "figN:end" markers, so the code on screen is the code that ran. Pure (no
// Remotion, no DOM).

export const VIDEO = "java-equality";

/**
 * Whether public/images/java-equality/ holds the two watercolors from
 * illustrations.json. Set it to true once `npm run illustrations --
 * java-equality` has written both WebPs. Every frame is laid out with room
 * for them either way.
 */
export const ILLUSTRATIONS = false;

/** "21.0.12.1", and the major version the notes print. */
export const JAVA_VERSION = m.meta.javaVersion;
export const JAVA_MAJOR = JAVA_VERSION.split(".")[0];

/** Fig. 1: two strings that spell "hi", and what the last two lines print. */
export const FIG1 = {
  lines: m.fig1.lines,
  /** Index-aligned with `lines`: null where a line prints nothing. */
  prints: printsFor(m.fig1.lines, m.fig1.printed),
};

/** Fig. 2: four strings and where each one's reference points. */
export const FIG2 = { lines: m.fig2.lines };

// Fig. 2 draws the string pool as a region of the heap. Equality.java checks
// that: interning a string built at run time stores that very heap object.
if (!m.pool["built.intern() == built"]) throw new Error("the pool did not keep the heap object");

/** One of the comparisons Equality.java ran on Fig. 2's strings. */
export const compared = (expr: string): boolean => {
  const hit = m.fig2.compare.find((c) => c.expr === expr);
  if (!hit) throw new Error(`Equality.java did not compare ${expr}`);
  return hit.value;
};

/** Fig. 3: two boxings of 127 and two of 128. */
export const FIG3 = {
  lines: m.fig3.lines,
  prints: printsFor(m.fig3.lines, m.fig3.printed),
};

/** What Fig. 3's three printlns printed, by what they compare. */
export const BOXED = {
  aSameB: printed(m.fig3, "a == b"),
  xSameY: printed(m.fig3, "x == y"),
  xEqualsY: printed(m.fig3, "x.equals(y)"),
};

/** The ints for which two autoboxings give one object, scanned from
 *  -100,000 to 100,000. */
export const CACHE = {
  low: m.cache.low,
  high: m.cache.high,
  count: m.cache.shared,
};
if (CACHE.count !== CACHE.high - CACHE.low + 1) throw new Error("the cached values are not one run");

/** The same scan with -XX:AutoBoxCacheMax=1000, and Fig. 3 run that way. */
export const CACHE_RAISED = {
  flag: "-XX:AutoBoxCacheMax=1000",
  high: m.cacheWithCacheMax1000.high,
  low: m.cacheWithCacheMax1000.low,
  xEqualsY: m.fig3.printedWithCacheMax1000[1],
};

/** Calls to Integer.valueOf in fig3's bytecode (javap -c): one per boxing. */
export const VALUE_OF_CALLS = m.meta.javapFig3ValueOfCalls;

/** What each line of a listing printed: println lines take the outputs in
 *  order, every other line prints nothing. */
function printsFor(lines: readonly string[], outputs: readonly boolean[]): (boolean | null)[] {
  let k = 0;
  const out = lines.map((l) => (l.includes("println") ? outputs[k++] : null));
  if (k !== outputs.length) throw new Error("listing and output do not line up");
  return out;
}

/** What the println of `expr` printed in a listing. */
function printed(fig: { lines: string[]; printed: boolean[] }, expr: string): boolean {
  const i = fig.lines.findIndex((l) => l.includes(`println(${expr})`));
  const v = printsFor(fig.lines, fig.printed)[i];
  if (i < 0 || v === null || v === undefined) throw new Error(`no println(${expr}) in the listing`);
  return v;
}
