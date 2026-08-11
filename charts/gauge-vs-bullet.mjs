/**
 * One number, three drawings, and a count of how many facts each carries.
 *
 * The gauge is the default KPI widget in every dashboard tool, and it is worth
 * being precise about what is wrong with it rather than just calling it ugly.
 * It spends a large, eye-catching object on a single number, and it encodes
 * that number as an *angle*, which is a mid-ranking channel, when a position
 * on a line was available for free. Everything else in the widget, the arc,
 * the needle, the tick ring, the shading, is furniture: remove it and no
 * information leaves.
 *
 * Then count the facts. A reader looking at a KPI usually needs four: where we
 * are, where we said we would be, how that compares to last period, and
 * whether the number is good. The gauge carries the first, gestures at the
 * fourth with color bands, and cannot carry the middle two at all.
 *
 * Stephen Few designed the bullet chart to fix exactly this. It is a bar for
 * the value, a perpendicular tick for the target, and shaded bands behind for
 * qualitative ranges, in about a fifth of the space and with position doing
 * the work instead of angle. All four facts fit, and twenty of them stack in a
 * column without becoming a wall of dials.
 *
 * The third panel is the reminder that a chart is not always the answer. If
 * there is one number and one comparison, a large number with a delta beside
 * it is faster to read than either chart and takes a tenth of the room. Reach
 * for the bullet when there is a target and a range; reach for the number when
 * there is not.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";
import { panel, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One KPI drawn three ways: as a speedometer gauge, as a bullet chart, and as a large number with a delta. The gauge carries one fact in the most space; the bullet carries value, target, ranges and a comparison in a fifth of it.";

const VALUE = 78;
const TARGET = 90;
const LAST = 71;
const MAX = 120;
const BANDS = [
  { to: 60, label: "poor" },
  { to: 85, label: "fair" },
  { to: MAX, label: "good" },
];

const DELTA = VALUE - LAST;
const TO_TARGET = TARGET - VALUE;

const GAUGE = panel(0, { y: [0, 1] });
const BULLET = panel(1, { y: [0, 1] });
const NUMBER = panel(2, { y: [0, 1] });

// A dial is a circle, and a circle needs the same pixels per unit on both
// axes. x spans three units across the frame width; y spans one down its
// height, so the horizontal radius has to be scaled by their ratio.
const WIDTH = 680;
const HEIGHT = 300;
const FRAME_W = (WIDTH - 30 - 18) / 3;
const FRAME_H = HEIGHT - 26 - 34;
const ASPECT = FRAME_H / FRAME_W;

const R = 0.36;
const RX = R * ASPECT;
const CX = (GAUGE.left + GAUGE.right) / 2;
const CY = 0.36;

/** Sweep from 210° to −30°, measured from the positive x axis: the shape
 *  every speedometer widget draws. */
const A0 = (210 * Math.PI) / 180;
const A1 = (-30 * Math.PI) / 180;
const angleFor = (v) => A0 + ((A1 - A0) * v) / MAX;
const onArc = (a, f = 1) => ({ x: CX + RX * f * Math.cos(a), y: CY + R * f * Math.sin(a) });

function arc(from, to, inner, outer, key) {
  const steps = 40;
  const outerPts = [];
  const innerPts = [];
  for (let k = 0; k <= steps; k++) {
    const a = angleFor(from) + ((angleFor(to) - angleFor(from)) * k) / steps;
    outerPts.push(onArc(a, outer));
    innerPts.push(onArc(a, inner));
  }
  return [...outerPts, ...innerPts.reverse(), outerPts[0]].map((p) => ({ ...p, key }));
}

const bandArcs = BANDS.flatMap((b, i) =>
  arc(i === 0 ? 0 : BANDS[i - 1].to, b.to, 0.78, 1, `band-${b.label}`),
);
const valueArc = arc(0, VALUE, 0.79, 0.99, "value");
const needle = [
  onArc(angleFor(VALUE), 0),
  onArc(angleFor(VALUE), 0.9),
].map((p) => ({ ...p, key: "needle" }));

// ── the bullet ──────────────────────────────────────────────────────────────
const BX0 = BULLET.left + 0.02;
const BX1 = BULLET.right - 0.02;
const bx = (v) => BX0 + ((BX1 - BX0) * v) / MAX;
const BY = 0.46;
const BH = 0.055;

const bulletBands = BANDS.map((b, i) => ({
  ...b,
  x1: bx(i === 0 ? 0 : BANDS[i - 1].to),
  x2: bx(b.to),
  y1: BY - BH,
  y2: BY + BH,
  shade: 0.16 - i * 0.05,
}));

export const caption = `One KPI as a gauge, as a bullet chart and as a number. The four facts a reader usually needs are the value (${VALUE}), the target (${TARGET}, so ${TO_TARGET} short), last period (${LAST}, so ${DELTA > 0 ? "up" : "down"} ${Math.abs(DELTA)}) and whether that is good.`;

export function render() {
  return plot({
    width: WIDTH,
    height: HEIGHT,
    marginTop: 26,
    marginLeft: 30,
    marginRight: 18,
    marginBottom: 34,
    ariaLabel: title,
    ...panelSpace(3),
    marks: [
      panelTitle(GAUGE, "Gauge: one fact, lots of ink", { fill: ACCENT }),
      panelTitle(BULLET, "Bullet: four facts, less ink", { fill: PRIMARY }),
      panelTitle(NUMBER, "Or just the number"),

      // ── gauge ───────────────────────────────────────────────────────────
      Plot.line(bandArcs, {
        x: "x",
        y: "y",
        z: "key",
        fill: MUTED,
        fillOpacity: 0.16,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1.2,
      }),
      Plot.line(valueArc, { x: "x", y: "y", z: "key", fill: ACCENT, fillOpacity: 0.75 }),
      Plot.line(needle, { x: "x", y: "y", z: "key", stroke: ACCENT, strokeWidth: 2.4 }),
      Plot.dot([onArc(angleFor(VALUE), 0)], { x: "x", y: "y", r: 4, fill: ACCENT }),
      Plot.text([{}], {
        x: CX,
        y: CY - 0.16,
        text: () => String(VALUE),
        fill: MUTED,
        fontSize: 20,
        fontWeight: 700,
        textAnchor: "middle",
      }),
      Plot.text([{}], {
        x: CX,
        y: GAUGE.bottom,
        text: () => "no target, no history",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),

      // ── bullet ──────────────────────────────────────────────────────────
      Plot.rect(bulletBands, {
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: MUTED,
        fillOpacity: "shade",
      }),
      Plot.rect([{}], {
        x1: bx(0),
        x2: bx(VALUE),
        y1: BY - BH / 2.4,
        y2: BY + BH / 2.4,
        fill: PRIMARY,
        fillOpacity: 0.9,
      }),
      Plot.rect([{}], {
        x1: bx(LAST) - 0.0016,
        x2: bx(LAST) + 0.0016,
        y1: BY - BH * 0.7,
        y2: BY + BH * 0.7,
        fill: MUTED,
      }),
      Plot.rect([{}], {
        x1: bx(TARGET) - 0.0022,
        x2: bx(TARGET) + 0.0022,
        y1: BY - BH,
        y2: BY + BH,
        fill: ACCENT,
      }),
      // `dy` is a constant option, so the three labels are separated by giving
      // each one its own y instead: y is a real channel here.
      Plot.text(
        [
          { at: bx(VALUE), ly: BY - 0.12, label: `${VALUE} now`, fill: PRIMARY },
          { at: bx(TARGET), ly: BY + 0.12, label: `target ${TARGET}`, fill: ACCENT },
          { at: bx(LAST), ly: BY - 0.21, label: `${LAST} last period`, fill: MUTED },
        ],
        {
          x: "at",
          y: "ly",
          text: "label",
          fill: "fill",
          fontSize: 10,
          fontWeight: 700,
          textAnchor: "middle",
          ...HALO,
        },
      ),
      Plot.text(
        BANDS.map((b, i) => ({
          label: b.label,
          at: (bx(i === 0 ? 0 : BANDS[i - 1].to) + bx(b.to)) / 2,
        })),
        {
          x: "at",
          y: BY - 0.3,
          text: "label",
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          ...HALO,
        },
      ),

      // ── the number ──────────────────────────────────────────────────────
      Plot.text([{}], {
        x: (NUMBER.left + NUMBER.right) / 2,
        y: 0.52,
        text: () => String(VALUE),
        fill: "currentColor",
        fillOpacity: 0.9,
        fontSize: 44,
        fontWeight: 700,
        textAnchor: "middle",
      }),
      Plot.text([{}], {
        x: (NUMBER.left + NUMBER.right) / 2,
        y: 0.37,
        text: () => `${DELTA > 0 ? "+" : ""}${DELTA} on last period`,
        fill: PRIMARY,
        fontSize: 12,
        fontWeight: 700,
        textAnchor: "middle",
      }),
      Plot.text([{}], {
        x: (NUMBER.left + NUMBER.right) / 2,
        y: 0.29,
        text: () => `${TO_TARGET} below target`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "middle",
      }),
    ],
  });
}
