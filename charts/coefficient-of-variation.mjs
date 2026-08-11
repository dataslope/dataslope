/**
 * The bigger standard deviation belongs to the steadier quantity.
 *
 * Two processes: a machine that fills bags to 50 g, and one that fills sacks to
 * 10 kg. The first has a standard deviation of 3 g and the second of 60 g,
 * which is twenty times larger, and the second machine is ten times more
 * consistent.
 *
 * The resolution is that a standard deviation carries the units of the thing
 * it describes, so comparing two of them across different scales is like
 * comparing a length in millimetres with a length in miles by looking at the
 * digits. The *coefficient of variation*, the standard deviation divided by
 * the mean, is dimensionless, and dimensionless is exactly what you need to
 * compare across scales.
 *
 * Three conditions have to hold before it means anything, and all three are
 * about the mean:
 *
 *   • the variable must be on a **ratio scale**, with a real zero. A CV of a
 *     Celsius temperature is a number whose value changes if you switch to
 *     Fahrenheit, which is a sign it was never a property of the weather;
 *   • the mean must be **far from zero**, or the ratio explodes. A quantity
 *     that averages 0.02 with a spread of 0.05 has a CV of 2.5, which is
 *     arithmetic rather than information;
 *   • the values should be **positive**. A mean near zero from cancelling
 *     positives and negatives makes the CV meaningless in a way no formula
 *     warns about.
 *
 * Where all three hold, the CV is the right way to say "which of these is more
 * variable" across quantities that share no units at all.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, mean, normalSamples } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Two filling machines: one dosing 50 g with a standard deviation of 3 g, one dosing 10,000 g with a standard deviation of 60 g. The second has twenty times the standard deviation and a tenth the coefficient of variation, and it is the steadier machine.";

const MACHINES = [
  { key: "Sachet line", mu: 50, sd: 3, unit: "g", seed: 7_231 },
  { key: "Sack line", mu: 10_000, sd: 60, unit: "g", seed: 4_907 },
].map((m) => {
  const draws = normalSamples(140, m.mu, m.sd, m.seed);
  return { ...m, draws, cv: m.sd / m.mu };
});

const [SACHET, SACK] = MACHINES;
const SD_RATIO = Math.round(SACK.sd / SACHET.sd);
const CV_RATIO = Math.round(SACHET.cv / SACK.cv);

const PANELS = MACHINES.map((m, k) =>
  panel(k, { x: [m.mu - 4 * m.sd, m.mu + 4 * m.sd], y: [0, 1] }),
);

/** A dot strip per machine, dodged into rows so 140 draws can be seen. */
const strips = MACHINES.flatMap((m, k) => {
  const p = PANELS[k];
  return m.draws.map((v, i) => ({
    key: m.key,
    x: p.px(v),
    y: 0.34 + ((i % 11) - 5) * 0.028,
  }));
});

export const caption = `Two filling machines. The first doses ${SACHET.mu} g with a standard deviation of ${SACHET.sd} g; the second doses ${SACK.mu.toLocaleString()} g with a standard deviation of ${SACK.sd} g, which is ${SD_RATIO} times larger and ${CV_RATIO} times more consistent.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 30,
    marginRight: 18,
    marginBottom: 52,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...MACHINES.flatMap((m, k) => {
        const p = PANELS[k];
        const ticks = [-3, 0, 3].map((z) => m.mu + z * m.sd);
        return [
          panelTitle(p, m.key, { fill: k === 0 ? ACCENT : PRIMARY }),
          Plot.link(
            ticks.map((v) => ({ x: p.px(v) })),
            {
              x1: "x",
              x2: "x",
              y1: p.py(0),
              y2: p.py(0.72),
              stroke: "currentColor",
              strokeOpacity: 0.1,
            },
          ),
          Plot.text(
            ticks.map((v) => ({ v, x: p.px(v) })),
            {
              x: "x",
              y: p.py(0),
              text: (d) => `${Math.round(d.v).toLocaleString()}`,
              fill: "currentColor",
              fillOpacity: 0.55,
              fontSize: 10,
              textAnchor: "middle",
              dy: 14,
            },
          ),
          Plot.link([{}], {
            x1: p.px(m.mu - m.sd),
            x2: p.px(m.mu + m.sd),
            y1: p.py(0.62),
            y2: p.py(0.62),
            stroke: k === 0 ? ACCENT : PRIMARY,
            strokeWidth: 3,
            strokeLinecap: "round",
          }),
          Plot.text([{}], {
            x: p.px(m.mu),
            y: p.py(0.62),
            text: () => `SD ${m.sd} ${m.unit}`,
            fill: k === 0 ? ACCENT : PRIMARY,
            fontSize: 10.5,
            fontWeight: 700,
            textAnchor: "middle",
            dy: -10,
            ...HALO,
          }),
          Plot.text([{}], {
            x: p.px(m.mu),
            y: p.py(0.86),
            text: () => `CV ${(m.cv * 100 < 1 ? (m.cv * 100).toFixed(1) : (m.cv * 100).toFixed(0))}%`,
            fill: k === 0 ? ACCENT : PRIMARY,
            fontSize: 14,
            fontWeight: 700,
            textAnchor: "middle",
            ...HALO,
          }),
          Plot.text([{}], {
            x: (p.left + p.right) / 2,
            y: p.py(0),
            text: () =>
              k === 0
                ? `a twentieth of the spread, and the wobblier machine`
                : `${SD_RATIO} times the spread, and the steadier one`,
            fill: MUTED,
            fontSize: 10,
            fontWeight: 700,
            textAnchor: "middle",
            dy: 32,
            ...HALO,
          }),
        ];
      }),
      Plot.dot(strips, { x: "x", y: "y", r: 2.6, fill: MUTED, fillOpacity: 0.5 }),
    ],
  });
}
