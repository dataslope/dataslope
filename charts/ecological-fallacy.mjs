/**
 * A strong relationship between group averages, and no relationship inside any
 * group.
 *
 * Every point on the left is a district: its mean income against its mean
 * turnout, and the correlation is strong and positive. It is a perfectly real
 * fact about districts.
 *
 * On the right the individuals are drawn. Within every district the slope is
 * about flat: knowing a person's income tells you nothing useful about whether
 * they voted. Both statements are true of the same data, and they are answers
 * to different questions, because the unit of analysis is different.
 *
 * The mechanism is that district means differ for reasons that have nothing to
 * do with the individual-level relationship. A district can be rich *and*
 * high-turnout because it is older, or because it has a long-running local
 * campaign, or for a dozen other reasons, and all of those show up as a
 * correlation between the two averages without any individual's income moving
 * their own turnout at all.
 *
 * This is the *ecological fallacy*: taking a relationship established at the
 * group level and applying it to a person. It is not the same as Simpson's
 * paradox, and the difference is worth holding onto. Simpson's is a *reversal*:
 * the same unit of analysis gives opposite signs depending on whether you
 * condition on a group. This is not a reversal at all. The two correlations
 * describe different populations, districts and people, and neither is wrong.
 *
 * The practical rule: name the unit before quoting a correlation. "Districts
 * with higher average income have higher turnout" and "richer people vote more"
 * are separate claims, and the first is no evidence at all for the second.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, SERIES, mean, normalSamples, rng } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "District mean income against district mean turnout, where the correlation is strong and positive, beside the individuals inside those districts, where the slope within every district is about flat. Both are true and they answer different questions.";

const DISTRICTS = 6;
const PER = 55;
const u = rng(1_517);

/** Districts are not on an exact line: a perfect r reads as construction
 *  rather than as data, and the point does not need one. */
const WOBBLE_X = [1.8, -2.4, 0.9, 2.6, -1.7, 0.4];
const WOBBLE_Y = [-2.2, 2.9, -1.4, 1.1, 2.4, -2.8];
const GROUPS = Array.from({ length: DISTRICTS }, (_, g) => {
  const income = 26 + g * 8.5 + WOBBLE_X[g];
  const turnout = 44 + g * 6.2 + WOBBLE_Y[g];
  const xs = normalSamples(PER, income, 4.4, 1000 + g * 53);
  const ys = normalSamples(PER, turnout, 4.6, 5000 + g * 71);
  return {
    g,
    color: SERIES[g % SERIES.length],
    people: xs.map((x, i) => ({ x, y: ys[i], g })),
    meanX: mean(xs),
    meanY: mean(ys),
  };
});

const PEOPLE = GROUPS.flatMap((d) => d.people);

const corr = (rows, kx, ky) => {
  const mx = mean(rows.map((d) => d[kx]));
  const my = mean(rows.map((d) => d[ky]));
  let n = 0;
  let dx = 0;
  let dy = 0;
  for (const d of rows) {
    n += (d[kx] - mx) * (d[ky] - my);
    dx += (d[kx] - mx) ** 2;
    dy += (d[ky] - my) ** 2;
  }
  return n / Math.sqrt(dx * dy);
};

const R_GROUP = corr(GROUPS.map((d) => ({ x: d.meanX, y: d.meanY })), "x", "y");
const R_WITHIN =
  GROUPS.reduce((s, d) => s + corr(d.people, "x", "y"), 0) / GROUPS.length;

const XD = [16, 80];
const YD = [30, 92];
const AGG = panel(0, { x: XD, y: YD });
const IND = panel(1, { x: XD, y: YD });

export const caption = `Every point on the left is a district: its mean income against its mean turnout, and the correlation is ${R_GROUP.toFixed(2)}. That is a real fact about districts. On the right the individuals inside those districts are drawn, and the average correlation *within* a district is ${R_WITHIN.toFixed(2)}: knowing a person's income tells you nothing useful about whether they voted. Both statements are true of the same data and they answer different questions, because the unit of analysis is different. The mechanism is that district means differ for reasons unconnected to the individual relationship. A district can be rich and high-turnout because it is older, or because a local campaign has been running for years, and each of those puts a correlation between the two averages without moving any individual's turnout with their own income. This is the ecological fallacy, and it is not Simpson's paradox. Simpson's is a reversal: the same unit of analysis gives opposite signs depending on whether you condition. Nothing reverses here. The two correlations describe different populations, districts and people, and neither is wrong. The rule is to name the unit before quoting a correlation, because "districts with higher average income have higher turnout" is not evidence for "richer people vote more".`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 46,
    marginRight: 20,
    marginBottom: 48,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(AGG, { ticks: [40, 60, 80] }),
      ...panelAxis(IND, { ticks: [40, 60, 80] }),
      panelTitle(AGG, `Districts: r = ${R_GROUP.toFixed(2)}`, { fill: PRIMARY }),
      panelTitle(IND, `People, within district: r = ${R_WITHIN.toFixed(2)}`, { fill: ACCENT }),

      Plot.line(
        GROUPS.map((d) => ({ x: AGG.px(d.meanX), y: AGG.py(d.meanY) })),
        { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2, strokeOpacity: 0.5 },
      ),
      Plot.dot(
        GROUPS.map((d) => ({ ...d, x: AGG.px(d.meanX), y: AGG.py(d.meanY) })),
        { x: "x", y: "y", r: 6, fill: "color", fillOpacity: 0.9 },
      ),

      Plot.dot(
        PEOPLE.map((d) => ({ ...d, px: IND.px(d.x), py: IND.py(d.y) })),
        {
          x: "px",
          y: "py",
          r: 2.2,
          fill: (d) => GROUPS[d.g].color,
          fillOpacity: 0.45,
        },
      ),
      // The flat within-district slopes, drawn so "about flat" is visible
      // rather than asserted.
      ...GROUPS.map((d) =>
        Plot.link([{}], {
          x1: IND.px(d.meanX - 7),
          x2: IND.px(d.meanX + 7),
          y1: IND.py(d.meanY),
          y2: IND.py(d.meanY),
          stroke: d.color,
          strokeWidth: 2,
        }),
      ),
      ...[AGG, IND].map((p, k) =>
        Plot.text([{}], {
          x: (p.left + p.right) / 2,
          y: p.bottom,
          text: () => (k === 0 ? "mean income, one dot per district" : "income, one dot per person"),
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 20,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: IND.px(20),
        y: IND.py(84),
        text: () => "flat inside every district",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
