/**
 * Why style guides discourage dual y-axes: the second axis is a free parameter,
 * and whoever sets it picks the story.
 *
 * Both panels are the *same two series* and the *same left axis*. The only
 * difference is where the right-hand axis starts and stops, and both choices
 * are perfectly ordinary ones. On the left it is fitted to the second series'
 * own range, so that series fills the frame and its noise reads as movement
 * that tracks the first. On the right it runs from zero, so the same series
 * flattens into a line along the bottom and reads as stable and irrelevant.
 *
 * Neither panel is a strawman and neither is wrong. That is the argument: a
 * reader cannot tell these two apart from the marks, only from the axis, and
 * almost nobody reads the axis. The correlation between the series is printed
 * in the caption and is unchanged by any of it, because a scale cannot create a
 * relationship, only the appearance of one.
 *
 * The seed is chosen so the two really are independent (r under 0.02); the
 * value is computed, not asserted.
 *
 * Drawn in pixel space because Plot has one y scale per plot, and two of them
 * is the entire subject.
 */
import { Plot, plot, rng, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The same two unrelated series drawn twice with two y-axes each. On the left the right-hand axis is fitted to the second series, so it fills the frame and appears to move with the first; on the right the same axis starts at zero, so the same series flattens along the bottom and appears stable.";

const N = 28;
const next = rng(18);
const gauss = () => {
  const a = Math.max(next(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
};

// A: a revenue-like series that climbs. B: a metric that does nothing. The two
// are generated from independent noise, so any apparent agreement is drawing.
const A = Array.from({ length: N }, (_, i) => 120 + i * 6.2 + gauss() * 9);
const B = Array.from({ length: N }, () => 41 + gauss() * 2.4);

const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
function corr(x, y) {
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < x.length; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

const CORR = corr(A, B);

/** Two ordinary choices for the right-hand axis, and the only difference
 *  between the panels: fitted to the series, or anchored at zero. */
const RIGHT_AXES = [
  { key: "Right axis: fitted to the series", lo: Math.min(...B) - 1.5, hi: Math.max(...B) + 1.5 },
  { key: "Right axis: starts at zero", lo: 0, hi: Math.max(...B) * 1.25 },
];

export const caption =
  `Same two series, same left axis, both panels. Only the right-hand axis differs, and both settings are ones you would pick without thinking. One says support tickets track revenue; the other says they are flat. Their actual correlation is ${CORR.toFixed(2)}, and no axis anywhere changes that.`;

// ── Layout, in pixels ──────────────────────────────────────────────────────
const W = 680;
const H = 330;
const TOP = 46;
const BOT = 250;
const PANELS = RIGHT_AXES.map((a, i) => ({ ...a, x0: i === 0 ? 62 : 400 }));
const PANEL_W = 218;

const px = (p, i) => p.x0 + (i / (N - 1)) * PANEL_W;
/** Map a value range onto the panel's vertical extent. */
const mapper = (lo, hi) => (v) => BOT - ((v - lo) / (hi - lo)) * (BOT - TOP);

// The left axis is identical in both panels, which is what makes the pair a
// fair comparison: only the right-hand scale moves.
const yLeft = mapper(Math.min(...A) - 12, Math.max(...A) + 12);

const line = (values, panel, y) =>
  values.map((v, i) => ({ x: px(PANELS[panel], i), y: y(v) }));

export function render() {
  const series = (rows, stroke) =>
    Plot.line(rows, { x: "x", y: "y", stroke, strokeWidth: 2 });

  const marks = [
    Plot.text(PANELS, {
      x: (d) => d.x0 + PANEL_W / 2,
      y: 16,
      text: "key",
      fill: MUTED,
      fontSize: 11.5,
      fontWeight: 600,
      textAnchor: "middle",
    }),
  ];

  PANELS.forEach((p, i) => {
    const yRight = mapper(p.lo, p.hi);
    marks.push(
      Plot.ruleX([{ x: p.x0 - 12 }], {
        x: "x",
        y1: TOP - 8,
        y2: BOT,
        stroke: PRIMARY,
        strokeOpacity: 0.5,
      }),
      Plot.ruleX([{ x: p.x0 + PANEL_W + 12 }], {
        x: "x",
        y1: TOP - 8,
        y2: BOT,
        stroke: ACCENT,
        strokeOpacity: 0.5,
      }),
      Plot.ruleY([{ y: BOT }], {
        y: "y",
        x1: p.x0 - 12,
        x2: p.x0 + PANEL_W + 12,
        stroke: "currentColor",
        strokeOpacity: 0.35,
      }),
      series(line(A, i, yLeft), PRIMARY),
      series(line(B, i, yRight), ACCENT),
      // The right axis's own bounds, which is the thing that changed.
      Plot.text([{}], {
        x: p.x0 + PANEL_W + 16,
        y: BOT,
        text: () => String(Math.round(p.lo)),
        fill: ACCENT,
        fontSize: 10,
        textAnchor: "start",
      }),
      Plot.text([{}], {
        x: p.x0 + PANEL_W + 16,
        y: TOP,
        text: () => String(Math.round(p.hi)),
        fill: ACCENT,
        fontSize: 10,
        textAnchor: "start",
      }),
      Plot.text([{}], {
        x: p.x0 + PANEL_W / 2,
        y: BOT + 26,
        text: () =>
          i === 0 ? "\"tickets track revenue\"" : "\"tickets are flat\"",
        fill: i === 0 ? ACCENT : MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
    );
  });

  marks.push(
    Plot.text([{}], {
      x: PANELS[0].x0 - 16,
      y: TOP - 18,
      text: () => "Revenue (left)",
      fill: PRIMARY,
      fontSize: 10.5,
      fontWeight: 600,
      textAnchor: "start",
    }),
    Plot.text([{}], {
      x: PANELS[1].x0 + PANEL_W + 16,
      y: TOP - 18,
      text: () => "Tickets (right)",
      fill: ACCENT,
      fontSize: 10.5,
      fontWeight: 600,
      textAnchor: "end",
    }),
  );

  return plot({
    height: H,
    width: W,
    marginTop: 30,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 14,
    ariaLabel: title,
    x: { axis: null, grid: false, domain: [0, W] },
    y: { axis: null, grid: false, domain: [H, 0] },
    marks,
  });
}
