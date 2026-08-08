/**
 * Compression codecs on the two axes that matter when you are choosing one:
 * how small the output gets, and how fast it decompresses.
 *
 * There is no winner. The frontier runs from "barely compresses, decompresses
 * at memory speed" to "half the bytes, an order of magnitude slower", and where
 * you want to sit on it is decided by the *other* number: how fast the thing on
 * the far side of the pipe is. That is what the two diagonal lines are for.
 * Each one is a constant total time for a fixed amount of data — bytes over
 * link bandwidth, plus bytes over decompression throughput — so a codec is
 * better than another *for that link* when it sits below the other's line.
 *
 * On a fast local link the cheap codecs win and the expensive ones are pure
 * overhead. On a slow link the ranking inverts, because the bytes you did not
 * send are worth more than the cycles you spent not sending them. Same points,
 * opposite conclusions, and the only thing that changed is a number that is
 * nowhere on the chart.
 *
 * Figures are the usual order of magnitude for text-like data — a Silesia- or
 * enwik-shaped corpus — and are labelled as approximate. The *shape* is the
 * claim, not the third significant figure.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Compression codecs plotted by compression ratio against decompression speed. The two are traded against each other, and which end of the trade wins depends on how fast the link on the other side is.";

/** ratio: original ÷ compressed. speed: MB/s decompressed, one core. */
const CODECS = [
  { name: "none", ratio: 1.0, speed: 6000 },
  { name: "lz4", ratio: 2.1, speed: 3400 },
  { name: "snappy", ratio: 2.0, speed: 1900 },
  { name: "zstd -1", ratio: 2.9, speed: 1500 },
  { name: "zstd -9", ratio: 3.4, speed: 1300 },
  { name: "gzip -6", ratio: 3.1, speed: 420 },
  { name: "brotli -11", ratio: 4.3, speed: 400 },
  { name: "xz -9", ratio: 4.6, speed: 90 },
];

/** Total seconds to move and unpack 1 GB over a link of `mbps` megabytes/sec. */
const MB = 1024;
const totalTime = (codec, linkMBs) => MB / codec.ratio / linkMBs + MB / codec.speed;

const LINKS = [
  { label: "local NVMe, 2000 MB/s", mbs: 2000 },
  { label: "cross-region, 40 MB/s", mbs: 40 },
];

const bestFor = (mbs) =>
  CODECS.reduce((best, c) => (totalTime(c, mbs) < totalTime(best, mbs) ? c : best));

const FAST_WINNER = bestFor(LINKS[0].mbs);
const SLOW_WINNER = bestFor(LINKS[1].mbs);

export const caption =
  FAST_WINNER.name === SLOW_WINNER.name
    ? `Ratio and decompression speed trade against each other; every codec here is somewhere on that curve.`
    : `The same eight codecs, ranked by total time to move a gigabyte and unpack it. Over a ${LINKS[0].mbs} MB/s local link the winner is ${FAST_WINNER.name}, because the bytes cost almost nothing to move and the cycles are the whole bill. Over a ${LINKS[1].mbs} MB/s link it is ${SLOW_WINNER.name}, because the bill is now the bytes. Neither codec changed; the number that decided it is not on the chart.`;

const X_DOMAIN = [60, 9000]; // log, MB/s
const Y_DOMAIN = [0.8, 5.0];

/** The set of codecs sharing a total-time contour through the winner, sampled
 *  across the x domain so the line is drawn rather than solved for. */
function contour(mbs) {
  const t = totalTime(bestFor(mbs), mbs);
  const pts = [];
  const [x0, x1] = X_DOMAIN;
  for (let i = 0; i <= 120; i++) {
    const speed = x0 * Math.pow(x1 / x0, i / 120);
    // t = MB/(ratio*mbs) + MB/speed  ⇒  ratio = MB / ((t - MB/speed) * mbs)
    const rest = t - MB / speed;
    if (rest <= 0) continue;
    const ratio = MB / (rest * mbs);
    if (ratio >= Y_DOMAIN[0] && ratio <= Y_DOMAIN[1]) pts.push({ speed, ratio });
  }
  return pts;
}

/**
 * Where a contour crosses a given ratio, solved rather than sampled.
 *
 * Anchoring the two labels by index into the sampled points put them on top of
 * each other: the curves have very different lengths inside the frame, so the
 * same fraction along each lands in the same corner. Choosing the *ratio*
 * instead places each label on a band of the figure known to be empty.
 */
function contourAt(mbs, ratio) {
  const t = totalTime(bestFor(mbs), mbs);
  // rest = t - MB/speed = MB/(ratio*mbs)  ⇒  speed = MB / (t - MB/(ratio*mbs))
  const denom = t - MB / (ratio * mbs);
  if (denom <= 0) return null;
  const speed = MB / denom;
  if (speed < X_DOMAIN[0] || speed > X_DOMAIN[1]) return null;
  return { speed, ratio };
}

// Chosen by hand, one per contour, in bands the scatter leaves clear: the fast
// link's line is labelled down near the uncompressed end, the slow link's up
// among the high-ratio codecs.
const LABEL_RATIO = [1.4, 3.6];

export function render() {
  const contours = LINKS.map((l, i) => ({ ...l, pts: contour(l.mbs), i }));

  return plot({
    height: 380,
    width: 680,
    marginLeft: 54,
    marginRight: 90,
    marginTop: 26,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      type: "log",
      domain: X_DOMAIN,
      label: "decompression speed, MB/s per core (log) →",
      ticks: [100, 300, 1000, 3000],
      tickFormat: (d) => String(d),
      grid: false,
    },
    y: {
      domain: Y_DOMAIN,
      label: "↑ compression ratio",
      ticks: [1, 2, 3, 4, 5],
      tickFormat: (d) => `${d}×`,
      grid: true,
    },
    marks: [
      // Equal-total-time contours: everything below a line is slower than the
      // winner on that link, everything above is faster.
      ...contours.map((c) =>
        Plot.line(c.pts, {
          x: "speed",
          y: "ratio",
          stroke: c.i === 0 ? MUTED : ACCENT,
          strokeWidth: 1.5,
          strokeDasharray: "5,4",
          strokeOpacity: 0.8,
        }),
      ),
      ...contours.map((c) => {
        const anchorPt = contourAt(c.mbs, LABEL_RATIO[c.i]);
        return Plot.text(anchorPt ? [anchorPt] : [], {
          x: "speed",
          y: "ratio",
          text: () => `equal total time,\n${c.label}`,
          fill: c.i === 0 ? MUTED : ACCENT,
          fontSize: 10,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "end",
          dx: -8,
          dy: -8,
          ...HALO,
        });
      }),

      Plot.dot(CODECS, {
        x: "speed",
        y: "ratio",
        r: 5,
        fill: (d) => (d === FAST_WINNER || d === SLOW_WINNER ? ACCENT : PRIMARY),
        fillOpacity: 0.9,
      }),
      Plot.text(CODECS, {
        x: "speed",
        y: "ratio",
        text: "name",
        fill: (d) => (d === FAST_WINNER || d === SLOW_WINNER ? ACCENT : MUTED),
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 9,
        dy: -1,
        ...HALO,
      }),

      Plot.ruleY([1], { stroke: GUIDE, strokeOpacity: 0.6 }),
      // Left end of the baseline: the right end is where `none` sits, and its
      // own label is already there.
      Plot.text([{}], {
        x: X_DOMAIN[0],
        y: 1,
        text: () => "1× is the uncompressed baseline",
        fill: MUTED,
        fontSize: 10,
        textAnchor: "start",
        dx: 4,
        dy: -8,
        ...HALO,
      }),
    ],
  });
}
