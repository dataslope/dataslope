/**
 * Hand-laid-out panels, for figures whose panels cannot share a scale.
 *
 * `plot()` in `_theme.mjs` says it plainly: Plot's `fx`/`fy` panels are windows
 * onto one pair of axes, so faceting only works when every panel shows the
 * *same quantities in the same units*. That covers most comparisons and it
 * does not cover the ones this file exists for:
 *
 *   • a linear axis beside a log axis (different scale *types*, same numbers);
 *   • a truncated axis beside a full one (deliberately different domains, and
 *     the difference is the entire subject);
 *   • a chart whose x is a category beside one whose x is time.
 *
 * The trick is to stop asking Plot to scale anything. The host plot is given a
 * meaningless coordinate system, `x ∈ [0, count]` and `y ∈ [0, 1]` with both
 * axes hidden, so panel *k* owns the unit square starting at *k*, and each
 * panel maps its own data into its own square with its own function. Plot is
 * then only drawing shapes at coordinates, which it does not need to
 * understand.
 *
 * What that costs is the axes: nothing scaled by hand gets ticks for free, so
 * `panelAxis()` draws them. What it buys is that two panels can disagree about
 * absolutely everything and still sit in one figure at one size, in the house
 * theme, with one caption.
 *
 * Usage:
 *
 *     const P = [0, 1].map((k) => panel(k, { y: [0, 260] }));
 *     return plot({
 *       ...panelSpace(2),
 *       marks: [
 *         ...P.flatMap((p, k) => [
 *           ...panelAxis(p, { ticks: [0, 100, 200] }),
 *           panelTitle(p, TITLES[k]),
 *         ]),
 *         Plot.rect(rows, { x1: ..., y2: (d) => P[d.k].py(d.value), ... }),
 *       ],
 *     });
 *
 * Positions come back in frame units, so every mark is a plain `Plot.rect`,
 * `Plot.line` or `Plot.text` with numbers in it.
 */
import { Plot, HALO, MUTED } from "./_theme.mjs";

/** Side padding inside a panel, as a fraction of the panel's width. */
const PAD_X = 0.085;
/** Where a panel's plotting area starts and stops, as fractions of the frame.
 *  The band above `TOP` is the panel title; the band below `BOTTOM` is its
 *  x-axis labels. */
const TOP = 0.83;
const BOTTOM = 0.15;

/**
 * The host plot's scale options: a coordinate system with no meaning, so that
 * nothing is scaled twice. Spread this into `plot()`.
 */
export function panelSpace(count) {
  return {
    x: { axis: null, domain: [0, count] },
    y: { axis: null, grid: false, domain: [0, 1] },
  };
}

/**
 * One panel's mapping functions.
 *
 * `y` is the panel's own data domain and `yType` its own scale type, so a log
 * panel and a linear panel differ by one option rather than by a second chart.
 * `x` is optional: pass a domain for a continuous horizontal axis, or leave it
 * out and use `band()` for categories.
 */
export function panel(index, { x: xDomain, y: yDomain, yType = "linear", xType = "linear" }) {
  const left = index + PAD_X;
  const right = index + 1 - PAD_X;

  const fwd = (type) => (type === "log" ? Math.log10 : (v) => v);
  const fy = fwd(yType);
  const fx = fwd(xType);

  const [ya, yb] = yDomain.map(fy);
  const py = (v) => BOTTOM + ((TOP - BOTTOM) * (fy(v) - ya)) / (yb - ya);

  const [xa, xb] = (xDomain ?? [0, 1]).map(fx);
  const px = (v) => left + ((right - left) * (fx(v) - xa)) / (xb - xa);

  /** Centre of slot `i` of `n`, for a categorical horizontal axis. */
  const band = (i, n) => left + ((right - left) * (i + 0.5)) / n;
  /** Width of one such slot, before any within-slot padding. */
  const bandWidth = (n) => (right - left) / n;

  return {
    index,
    left,
    right,
    top: TOP,
    bottom: BOTTOM,
    px,
    py,
    band,
    bandWidth,
    yDomain,
    yType,
  };
}

/**
 * A panel's vertical axis: the tick labels, the faint rules behind the data,
 * and nothing else. Matches the house theme, which has no frame and no tick
 * marks.
 */
export function panelAxis(p, { ticks, format = String, rules = true, labelSize = 10.5 } = {}) {
  const rows = ticks.map((v) => ({ v, y: p.py(v) }));
  return [
    ...(rules
      ? [
          Plot.link(rows, {
            x1: p.left,
            x2: p.right,
            y1: "y",
            y2: "y",
            stroke: "currentColor",
            strokeOpacity: 0.1,
          }),
        ]
      : []),
    Plot.text(rows, {
      x: p.left,
      y: "y",
      text: (d) => format(d.v),
      fill: "currentColor",
      fillOpacity: 0.62,
      fontSize: labelSize,
      textAnchor: "end",
      dx: -7,
    }),
  ];
}

/** A panel's heading, sitting above its plotting area. */
export function panelTitle(p, text, { fill = MUTED, fontSize = 11.5 } = {}) {
  return Plot.text([{}], {
    x: (p.left + p.right) / 2,
    y: 0.955,
    text: () => text,
    fill,
    fontSize,
    fontWeight: 700,
    lineHeight: 1.35,
    textAnchor: "middle",
    ...HALO,
  });
}

/** Category labels under a panel drawn with `band()`. */
export function panelCategories(p, labels, { fontSize = 10, rotate = 0 } = {}) {
  return Plot.text(
    labels.map((label, i) => ({ label, x: p.band(i, labels.length) })),
    {
      x: "x",
      y: BOTTOM,
      text: "label",
      fill: "currentColor",
      fillOpacity: 0.62,
      fontSize,
      rotate,
      textAnchor: rotate ? "end" : "middle",
      dy: 13,
    },
  );
}

/** The zero line, or whichever value a panel's marks are measured from. */
export function panelBaseline(p, at = p.yDomain[0]) {
  return Plot.link([{}], {
    x1: p.left,
    x2: p.right,
    y1: p.py(at),
    y2: p.py(at),
    stroke: "currentColor",
    strokeOpacity: 0.35,
  });
}
