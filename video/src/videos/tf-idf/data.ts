import m from "./measurements.json";

// Every number the video shows. Computed, not typed in: measure.py builds the
// lesson's TF-IDF table by hand (Counter and math.log, exactly as
// content/courses/natural-language-processing-python/tf-idf.mdx writes it)
// and again with scikit-learn 1.9.1, asserts the two agree to 1e-12, and
// measurements.json is its output, imported here as it is. Pure (no Remotion,
// no DOM).
//
// The formula on screen is the lesson's and the textbook's:
//   tf(w, d) = count / words in d,  idf(w) = ln(N / df(w)),  tf-idf = tf * idf.
// scikit-learn's default TfidfVectorizer() smooths it to
//   idf(w) = ln((1 + N) / (1 + df(w))) + 1,
// which never reaches zero; Fig. 5 shows both.

export const VIDEO = "tf-idf";

/**
 * Whether public/images/tf-idf/ holds the two watercolors from
 * illustrations.json. Set it to true once `npm run illustrations -- tf-idf`
 * has written both WebPs. Every frame is laid out with room for them either
 * way.
 */
export const ILLUSTRATIONS = true;

/** The lesson's three documents, as written and as `.split()` tokens. */
export const CORPUS: readonly string[] = m.corpus;
export const DOCS: readonly (readonly string[])[] = m.docs;
export const N = m.N;
export const LENGTHS: readonly number[] = m.lengths;

/** Table columns: "the", then each document's own words, in reading order. */
export const VOCAB: readonly string[] = m.vocab;
/** COUNTS[doc][col], and the rest likewise. */
export const COUNTS: readonly (readonly number[])[] = m.counts;
export const DF: readonly number[] = m.df;
export const IDF: readonly number[] = m.idf;
export const TF: readonly (readonly number[])[] = m.tf;
export const TFIDF: readonly (readonly number[])[] = m.tfidf;

export const THE = VOCAB.indexOf("the");
export const CAT = VOCAB.indexOf("cat");

/** Which document (0-based) uses each column's word, or -1 for "the". */
export const OWNER: readonly number[] = VOCAB.map((_, j) =>
  DF[j] === N ? -1 : COUNTS.findIndex((row) => row[j] > 0),
);

export const MAX_COUNT = Math.max(...COUNTS.flat());
export const MAX_TFIDF = Math.max(...TFIDF.flat());

/** scikit-learn's default TfidfVectorizer(), on the same corpus. */
export const DEFAULT_IDF: readonly number[] = m.sklearnDefault.idf;
/** Its output rows: raw counts times that idf, each row scaled to length one. */
export const DEFAULT_ROWS: readonly (readonly number[])[] = m.sklearnDefault.rows;

const SPELLED = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
/** A small whole number in words, as running text sets it. */
export const spell = (k: number) => SPELLED[k] ?? String(k);

/** "1.10", "0.18"; an exact zero is set as "0", which is the point. */
export const num = (x: number, digits = 2) => (x === 0 ? "0" : x.toFixed(digits));
