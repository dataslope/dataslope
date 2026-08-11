/**
 * The night before Challenger, drawn twice.
 *
 * On 27 January 1986 the engineers at Morton Thiokol spent the evening trying
 * to talk NASA out of launching in the cold. They believed the booster
 * O-rings stiffened at low temperature and would not seal. They were right,
 * and they lost the argument, and one reason they lost it is on this page.
 *
 * The charts they faxed over showed the flights that had suffered O-ring
 * damage. That is the natural thing to send when the subject is damage, and
 * it is exactly the wrong thing: conditioning on the outcome throws away every
 * flight that flew cold and came back fine, and every flight that flew warm
 * and came back fine, which is where the whole signal lives. Seven points with
 * damage scattered from 53°F to 75°F look like noise, because among damaged
 * flights alone, temperature really does not predict much.
 *
 * Put all twenty-three back and the picture is not subtle. Every flight below
 * 65°F had damage. Almost none above it did. Challenger launched at 31°F, a
 * full 22°F colder than anything ever flown, and the launch temperature is off
 * the left edge of the entire flight record.
 *
 * This is the clearest case anyone has of a chart that would have changed
 * history, and its failure is not artistic. Nothing is mislabelled, no axis is
 * broken, no color lies. The chart is wrong because of which rows are in it.
 *
 * ── On the numbers ─────────────────────────────────────────────────────────
 *
 * The O-ring table from Dalal, Fowlkes and Hoadley (1989), reproduced in every
 * treatment since: ambient temperature at launch in °F against the number of
 * primary O-rings showing thermal distress, for the twenty-three shuttle
 * flights whose boosters were recovered.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Shuttle O-ring damage against launch temperature, drawn twice. The left panel shows only the seven flights that had damage, where temperature looks unrelated. The right panel shows all twenty-three flights, where every launch below 65°F had damage and almost none above it did. Challenger launched at 31°F, off the left edge of the record.";

/** [ambient °F at launch, primary O-rings with thermal distress]. */
const FLIGHTS = [
  [53, 2],
  [57, 1],
  [58, 1],
  [63, 1],
  [66, 0],
  [67, 0],
  [67, 0],
  [67, 0],
  [68, 0],
  [69, 0],
  [70, 0],
  [70, 1],
  [70, 1],
  [70, 0],
  [72, 0],
  [73, 0],
  [75, 0],
  [75, 2],
  [76, 0],
  [76, 0],
  [78, 0],
  [79, 0],
  [81, 0],
].map(([temp, damaged]) => ({ temp, damaged }));

const CHALLENGER_TEMP = 31;
const SHOWN = "What Thiokol sent: the damaged flights";
const NOT_SHOWN = "What they had: every flight";

const damaged = FLIGHTS.filter((d) => d.damaged > 0);
const clean = FLIGHTS.filter((d) => d.damaged === 0);

/** Several flights share a temperature and a damage count, and a dot drawn on
 *  a dot is one dot. Stack the repeats a fraction of a unit apart so the
 *  reader can count them; the level each stack sits on is still its value. */
function stacked(flights, panel) {
  const seen = new Map();
  return flights.map((d) => {
    const key = `${d.temp}:${d.damaged}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return { ...d, panel, y: d.damaged + n * 0.13 };
  });
}

const rows = [...stacked(damaged, SHOWN), ...stacked(FLIGHTS, NOT_SHOWN)];

const COLDEST = Math.min(...FLIGHTS.map((d) => d.temp));
const cold = FLIGHTS.filter((d) => d.temp < 65);
const warm = FLIGHTS.filter((d) => d.temp >= 65);
const coldHit = cold.filter((d) => d.damaged > 0).length;
const warmHit = warm.filter((d) => d.damaged > 0).length;

export const caption = `The flights NASA was faxed the night before the launch, beside the same table with the other sixteen rows put back. All ${cold.length} launches below 65°F had O-ring damage and ${warmHit} of the ${warm.length} above it did; *Challenger* went up at ${CHALLENGER_TEMP}°F, ${COLDEST - CHALLENGER_TEMP} degrees colder than anything that had flown.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 58,
    marginRight: 20,
    marginBottom: 52,
    ariaLabel: title,
    x: {
      label: "Ambient temperature at launch (°F)",
      labelAnchor: "center",
      domain: [26, 86],
      ticks: [30, 40, 50, 60, 70, 80],
    },
    y: {
      label: "O-rings with thermal distress",
      domain: [-0.5, 2.75],
      ticks: [0, 1, 2],
      tickFormat: (d) => String(d),
    },
    fx: { label: null, domain: [SHOWN, NOT_SHOWN] },
    marks: [
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.12 }),
      Plot.ruleX([CHALLENGER_TEMP], {
        stroke: ACCENT,
        strokeWidth: 1.5,
        strokeDasharray: "4,3",
      }),
      Plot.text([{ panel: SHOWN }, { panel: NOT_SHOWN }], {
        fx: "panel",
        x: CHALLENGER_TEMP,
        y: 2.75,
        text: () => `Challenger\nlaunched here\n${CHALLENGER_TEMP}°F`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 6,
        dy: 22,
        ...HALO,
      }),
      Plot.dot(rows, {
        fx: "panel",
        x: "temp",
        y: "y",
        r: 5,
        fill: (d) => (d.damaged > 0 ? ACCENT : PRIMARY),
        fillOpacity: 0.75,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1,
      }),
      Plot.text([{ panel: NOT_SHOWN }], {
        fx: "panel",
        x: 65,
        y: -0.5,
        text: () => `the ${clean.length} clean flights\nthe first chart left out`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 6,
        dy: -12,
        ...HALO,
      }),
      Plot.ruleX([{ panel: NOT_SHOWN }], {
        fx: "panel",
        x: 64.5,
        stroke: GUIDE,
        strokeWidth: 1.25,
        strokeDasharray: "3,3",
      }),
      Plot.text([{ panel: SHOWN }], {
        fx: "panel",
        x: 86,
        y: 2.75,
        text: () => `${damaged.length} points,\nno pattern`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -8,
        dy: 22,
        ...HALO,
      }),
    ],
  });
}
