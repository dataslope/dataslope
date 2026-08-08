/**
 * Two reference lines turning a cloud of points into four named groups.
 *
 * A scatter of accounts by spend and satisfaction is a shape. It has a
 * direction and a spread, and a reader can see both, but there is nothing in
 * it to act on: no point is on one side of anything, because there are no
 * sides. Adding the two thresholds the business already uses, the spend that
 * makes an account strategic and the score below which it is at risk, does not
 * add a single number to the chart. It adds the *categories*, and with them
 * the sentence "eleven of our strategic accounts are unhappy", which is a
 * meeting rather than a picture.
 *
 * The warning that belongs with the technique: a reference line is an
 * assertion, and a threshold chosen after seeing the data can be moved until
 * the quadrant counts say what the author wanted. Thresholds should come from
 * somewhere, and the chart should say where.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "The same scatter of accounts drawn twice, once bare and once with a spend threshold and a satisfaction threshold crossing it. The bare version is a shape; the divided version names four groups and counts them.";

const N = 150;
const u = rng(8123);

/** Spend on a log-ish spread, satisfaction correlated with it but loosely, so
 *  every quadrant is populated and the interesting one is not empty. */
const points = Array.from({ length: N }, () => {
  const spend = Math.round(Math.exp(u() * 3.1 + 1.6) * 10) / 10;
  const noise = (u() + u() + u() - 1.5) * 2.2;
  const score = Math.max(1, Math.min(10, 3.6 + Math.log10(spend) * 1.9 + noise));
  return { spend, score };
});

/** Both thresholds are the ones the business already uses, not ones fitted to
 *  the points, which is the difference between a reference line and a claim
 *  dressed up as one. */
const SPEND_CUT = 25;
const SCORE_CUT = 6.5;

const BARE = "A shape";
const CUT = "Four groups";

const rows = [BARE, CUT].flatMap((panel) => points.map((d) => ({ ...d, panel })));

const quadrant = (d) =>
  d.spend >= SPEND_CUT
    ? d.score >= SCORE_CUT
      ? "grow"
      : "rescue"
    : d.score >= SCORE_CUT
      ? "keep"
      : "watch";

const count = (name) => points.filter((d) => quadrant(d) === name).length;
const RESCUE = count("rescue");
const GROW = count("grow");

const MAX_SPEND = Math.max(...points.map((d) => d.spend));

/** Corner labels for the divided panel, one per quadrant, anchored outward so
 *  none of them drifts across the thresholds they are naming. */
const LABELS = [
  { x: MAX_SPEND, y: 10.1, text: `grow (${GROW})`, side: "end", muted: true },
  { x: MAX_SPEND, y: 1.5, text: `rescue (${RESCUE})`, side: "end", muted: false },
  { x: 0, y: 10.1, text: `keep (${count("keep")})`, side: "start", muted: true },
  { x: 0, y: 1.5, text: `watch (${count("watch")})`, side: "start", muted: true },
];

export const caption = `One scatter, drawn twice. On the left it is a shape: it has a direction and a spread, and nothing to act on, because no point is on one side of anything. On the right the two thresholds the business already uses, ${SPEND_CUT}k of spend and a score of ${SCORE_CUT}, add no data at all and add the categories, which is what turns the picture into the sentence "${RESCUE} of our ${RESCUE + GROW} largest accounts are unhappy". That is a meeting rather than a chart. The warning that goes with the technique: a reference line is an assertion, and a threshold picked after seeing the points can be nudged until the counts say what the author wanted. Thresholds should come from somewhere the reader can check, and the chart should say where.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 24,
    marginLeft: 46,
    marginRight: 22,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: [BARE, CUT] },
    x: {
      label: "Annual spend (thousands)",
      labelAnchor: "center",
      domain: [0, MAX_SPEND * 1.06],
      ticks: 4,
    },
    y: { label: "Satisfaction (1-10)", domain: [1, 10.4], ticks: 4 },
    marks: [
      Plot.ruleY([SCORE_CUT], {
        fx: () => CUT,
        stroke: GUIDE,
        strokeDasharray: "5 4",
      }),
      Plot.ruleX([SPEND_CUT], {
        fx: () => CUT,
        stroke: GUIDE,
        strokeDasharray: "5 4",
      }),
      Plot.dot(rows, {
        fx: "panel",
        x: "spend",
        y: "score",
        r: 3.2,
        fill: (d) =>
          d.panel === CUT && quadrant(d) === "rescue" ? ACCENT : PRIMARY,
        fillOpacity: (d) =>
          d.panel === CUT && quadrant(d) === "rescue" ? 0.95 : 0.45,
      }),
      ...LABELS.map((l) =>
        Plot.text([l], {
          fx: () => CUT,
          x: "x",
          y: "y",
          text: "text",
          fill: l.muted ? MUTED : ACCENT,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: l.side,
          dx: l.side === "start" ? 3 : -3,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        fx: () => CUT,
        x: SPEND_CUT,
        y: 9.2,
        text: () => `${SPEND_CUT}k`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 4,
        ...HALO,
      }),
      Plot.text([{}], {
        fx: () => BARE,
        frameAnchor: "bottom-right",
        text: () => "nothing to act on",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -6,
        dy: -6,
        ...HALO,
      }),
    ],
  });
}
