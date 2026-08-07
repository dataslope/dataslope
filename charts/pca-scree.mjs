/**
 * A scree plot, and the cumulative curve that is the reason to draw one.
 *
 * Bars are the variance each principal component explains; the line is the
 * running total. The decision a scree plot exists to support is "how many
 * components do I keep", and the honest answer is read off the line rather
 * than the bars: the number of components at which the cumulative share
 * crosses whatever threshold the work needs.
 *
 * The eigenvalues come from a real covariance structure, not a hand-drawn
 * decline: twelve correlated features built from four latent factors plus
 * noise, decomposed by power iteration. That is what gives the curve its elbow,
 * and it is why the elbow lands at four rather than wherever looked tidy.
 */
import { Plot, plot, rng, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A scree plot of twelve principal components: bars falling steeply for the first few and then flattening, with a cumulative line crossing ninety percent partway along.";

const P = 12;
const FACTORS = 4;
const next = rng(90210);
const gauss = () => {
  const a = Math.max(next(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
};

// Twelve observed features built from four latent factors: the structure that
// makes the first four components worth keeping and the rest noise.
const LOADINGS = Array.from({ length: P }, () =>
  Array.from({ length: FACTORS }, () => gauss()),
);

/** Covariance implied by those loadings plus independent noise. */
const COV = Array.from({ length: P }, (_, i) =>
  Array.from({ length: P }, (_, j) => {
    let s = 0;
    for (let f = 0; f < FACTORS; f++) s += LOADINGS[i][f] * LOADINGS[j][f];
    return i === j ? s + 0.6 : s;
  }),
);

/** Eigenvalues by power iteration with deflation: enough for a scree plot, and
 *  it keeps the figure free of a linear-algebra dependency. */
function eigenvalues(matrix, k) {
  const A = matrix.map((row) => [...row]);
  const out = [];
  for (let c = 0; c < k; c++) {
    let v = Array.from({ length: P }, (_, i) => (i === c ? 1 : 0.1));
    let lambda = 0;
    for (let it = 0; it < 300; it++) {
      const w = A.map((row) => row.reduce((s, a, j) => s + a * v[j], 0));
      const norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0));
      if (norm === 0) break;
      v = w.map((x) => x / norm);
      lambda = norm;
    }
    out.push(lambda);
    for (let i = 0; i < P; i++) for (let j = 0; j < P; j++) A[i][j] -= lambda * v[i] * v[j];
  }
  return out;
}

const EIG = eigenvalues(COV, P);
const TOTAL = EIG.reduce((s, v) => s + v, 0);
let acc = 0;
const rows = EIG.map((v, i) => {
  acc += v / TOTAL;
  return { pc: i + 1, share: v / TOTAL, cumulative: acc };
});

const THRESHOLD = 0.9;
const KEEP = rows.find((r) => r.cumulative >= THRESHOLD);

export const caption =
  `Bars are what each component explains; the line is the running total. The bars fall steeply and then flatten, which is the elbow people look for, but the line is what answers the question: ${KEEP.pc} components carry ${(KEEP.cumulative * 100).toFixed(0)}% of the variance and the remaining ${P - KEEP.pc} carry the rest between them. Read the decision off the line, not off where the bars look like they stop.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 34,
    marginLeft: 56,
    marginRight: 30,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Principal component", labelAnchor: "center", domain: rows.map((r) => r.pc) },
    y: { label: "Share of variance", domain: [0, 1.06], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.barY(rows, { x: "pc", y: "share", fill: PRIMARY, fillOpacity: 0.45 }),
      Plot.line(rows, { x: "pc", y: "cumulative", stroke: ACCENT, strokeWidth: 2 }),
      Plot.dot(rows, { x: "pc", y: "cumulative", fill: ACCENT, r: 3 }),
      Plot.ruleY([THRESHOLD], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: rows.at(-1).pc,
        y: THRESHOLD,
        text: () => `${THRESHOLD * 100}% of variance`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dy: -8,
        ...HALO,
      }),
      Plot.text([KEEP], {
        x: "pc",
        y: "cumulative",
        text: (d) => `${d.pc} components\nreach it`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 10,
        dy: 18,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
