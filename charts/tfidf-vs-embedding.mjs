/**
 * Why "similar documents" means two different things depending on whether you
 * compare bags of words or embeddings.
 *
 * Four short sentences. Two of them say the same thing in different words; two
 * of them share words while meaning something else. TF-IDF cosine similarity
 * can only see the overlap in vocabulary, so it scores the paraphrase pair near
 * zero and the lexical-overlap pair high. An embedding model, which is fitted
 * on contexts rather than counts, reverses the ranking.
 *
 * The TF-IDF numbers are *computed here*, not asserted: the vectors are built
 * from the sentences below with the standard smoothed IDF, so if the wording
 * changes the figure changes with it. The embedding column is illustrative —
 * running a real model at build time is not on — and is labelled as such in
 * the figure so nobody reads it as a measurement.
 *
 * Drawn as two slope lines rather than grouped bars: the point is the
 * *reordering*, and a slope chart shows a swap as a crossing, which is the one
 * thing grouped bars make you work for.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED } from "./_theme.mjs";

export const title =
  "Two sentence pairs scored twice. TF-IDF cosine ranks the pair that shares words above the pair that shares meaning; an embedding model reverses the order, and the two lines cross.";

const PAIRS = [
  {
    key: "same meaning,\ndifferent words",
    a: "the flight was delayed by fog",
    b: "mist held up the plane departure",
    embedding: 0.82,
  },
  {
    key: "shared words,\ndifferent meaning",
    a: "the bank raised its rates",
    b: "the river bank raised its banks",
    embedding: 0.29,
  },
];

// ── TF-IDF, computed rather than quoted ────────────────────────────────────
const tokenize = (s) => s.toLowerCase().match(/[a-z]+/g) ?? [];
const DOCS = PAIRS.flatMap((p) => [tokenize(p.a), tokenize(p.b)]);

/** Smoothed IDF, as scikit-learn's TfidfVectorizer computes it. */
const idf = (() => {
  const df = new Map();
  for (const doc of DOCS) {
    for (const term of new Set(doc)) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const n = DOCS.length;
  return (term) => Math.log((1 + n) / (1 + (df.get(term) ?? 0))) + 1;
})();

/** An L2-normalised TF-IDF vector, keyed by term. */
function vector(text) {
  const counts = new Map();
  for (const term of tokenize(text)) counts.set(term, (counts.get(term) ?? 0) + 1);
  const raw = new Map();
  for (const [term, tf] of counts) raw.set(term, tf * idf(term));
  const norm = Math.hypot(...raw.values());
  const out = new Map();
  for (const [term, w] of raw) out.set(term, w / norm);
  return out;
}

function cosine(a, b) {
  let dot = 0;
  for (const [term, w] of a) dot += w * (b.get(term) ?? 0);
  return dot;
}

const ROWS = PAIRS.map((p) => ({
  ...p,
  tfidf: cosine(vector(p.a), vector(p.b)),
}));

const PARAPHRASE = ROWS[0];
const OVERLAP = ROWS[1];
const CROSSES = PARAPHRASE.tfidf < OVERLAP.tfidf && PARAPHRASE.embedding > OVERLAP.embedding;

export const caption = CROSSES
  ? `TF-IDF scores the paraphrase pair at ${PARAPHRASE.tfidf.toFixed(2)} and the pun pair at ${OVERLAP.tfidf.toFixed(2)}: it can only count shared tokens, and the paraphrase shares almost none. Embeddings are fitted on context rather than counts, so the ranking flips. Neither is wrong; they answer different questions, and the lines crossing is the whole reason to know which one you asked.`
  : `TF-IDF scores the paraphrase pair at ${PARAPHRASE.tfidf.toFixed(2)} and the pun pair at ${OVERLAP.tfidf.toFixed(2)}. TF-IDF counts shared tokens; embeddings are fitted on context.`;

// ── Layout ─────────────────────────────────────────────────────────────────
const W = 680;
const H = 340;
const LEFT = 250; // x of the TF-IDF column
const RIGHT = 500; // x of the embedding column
const TOP = 74; // y of similarity 1.0
const BOTTOM = 262; // y of similarity 0.0

const y = (v) => BOTTOM - v * (BOTTOM - TOP);

const COLORS = [ACCENT, MUTED];

const segments = ROWS.map((r, i) => ({
  x1: LEFT,
  x2: RIGHT,
  y1: y(r.tfidf),
  y2: y(r.embedding),
  stroke: COLORS[i],
}));

const TICKS = [0, 0.25, 0.5, 0.75, 1];

export function render() {
  return plot({
    height: H,
    width: W,
    marginTop: 26,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 20,
    ariaLabel: title,
    // Pixel space: the two columns are categories with no order between them,
    // and the sentence blocks on the left are prose, not data positions.
    x: { axis: null, grid: false, domain: [0, W] },
    y: { axis: null, grid: false, domain: [H, 0] },
    marks: [
      // Similarity gridlines, spanning only the columns they apply to.
      ...TICKS.map((t) =>
        Plot.ruleY([{ y: y(t) }], {
          y: "y",
          x1: LEFT - 30,
          x2: RIGHT + 30,
          stroke: GUIDE,
          strokeOpacity: t === 0 ? 0.6 : 0.35,
        }),
      ),
      Plot.text(
        TICKS.map((t) => ({ t, y: y(t) })),
        {
          x: LEFT - 38,
          y: "y",
          text: (d) => d.t.toFixed(2),
          fill: MUTED,
          fontSize: 10.5,
          textAnchor: "end",
        },
      ),

      Plot.text([{ x: LEFT }, { x: RIGHT }], {
        x: "x",
        y: 44,
        text: (d) => (d.x === LEFT ? "TF-IDF cosine" : "embedding cosine"),
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "middle",
      }),
      Plot.text([{}], {
        x: RIGHT,
        y: 58,
        text: () => "(illustrative)",
        fill: MUTED,
        fontSize: 10,
        textAnchor: "middle",
      }),

      Plot.link(segments, {
        x1: "x1",
        y1: "y1",
        x2: "x2",
        y2: "y2",
        stroke: "stroke",
        strokeWidth: 2,
      }),
      Plot.dot(
        segments.flatMap((s) => [
          { x: s.x1, y: s.y1, fill: s.stroke },
          { x: s.x2, y: s.y2, fill: s.stroke },
        ]),
        { x: "x", y: "y", fill: "fill", r: 4 },
      ),

      // Value labels, outside the columns so the crossing stays clean.
      Plot.text(ROWS, {
        x: LEFT - 12,
        y: (d) => y(d.tfidf),
        text: (d) => d.tfidf.toFixed(2),
        fill: (d) => (d === PARAPHRASE ? ACCENT : MUTED),
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.text(ROWS, {
        x: RIGHT + 12,
        y: (d) => y(d.embedding),
        text: (d) => d.embedding.toFixed(2),
        fill: (d) => (d === PARAPHRASE ? ACCENT : MUTED),
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),

      // The sentence pairs, on the left, coloured to match their line.
      Plot.text(
        ROWS.map((r, i) => ({ ...r, i })),
        {
          x: 16,
          y: (d) => 92 + d.i * 92,
          text: (d) => `${d.key.replace("\n", " ")}\n"${d.a}"\n"${d.b}"`,
          fill: (d) => COLORS[d.i],
          fontSize: 10.5,
          fontWeight: 500,
          lineHeight: 1.45,
          textAnchor: "start",
        },
      ),

      Plot.text([{}], {
        x: (LEFT + RIGHT) / 2,
        y: 296,
        text: () =>
          CROSSES
            ? "the lines cross: the two measures disagree about which pair is more similar"
            : "the two measures agree on the ranking here",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
