/**
 * Two unrelated things, and the selection that makes them look opposed.
 *
 * In the population on the left, ability and interview score are independent:
 * the cloud is round, the correlation is about zero, and knowing one tells you
 * nothing about the other. That is the truth about this world.
 *
 * The admissions rule is a sum: you get in if ability plus interview clears a
 * bar. The right panel shows only the people who did, and inside that group the
 * two variables are strongly *negatively* correlated.
 *
 * Nothing happened to anybody. The correlation is manufactured by the selection
 * itself, and the mechanism is easy to see once stated: among people who got
 * in, someone with a weak interview must have had strong ability, because
 * otherwise they would not have cleared the bar. The corner of the cloud where
 * both are low has been removed, and removing one corner of a round cloud
 * leaves a diagonal band.
 *
 * This is Berkson's paradox, and it is why "among our customers", "among
 * hospital patients", "among people who responded" and "among successful
 * startups" are all phrases that should make you check what got someone into
 * the dataset. The classic medical version: two unrelated diseases appear
 * correlated among inpatients, because having either one is a reason to be
 * admitted, so patients with one are enriched for having no other reason to be
 * there.
 *
 * The difference from confounding is worth keeping straight. A confounder is a
 * common *cause* and adding it to the model fixes things. Here there is no
 * common cause; the distortion is caused by *conditioning* on a common effect,
 * and adding the selection variable to the model makes it worse rather than
 * better.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, mean, normalSamples } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Two independent traits in a population, and the same people among those admitted by a rule that adds the two together. The population correlation is about zero; inside the admitted group it is strongly negative, and nothing about anybody changed.";

const N = 420;
const A = normalSamples(N, 50, 12, 6_101);
const B = normalSamples(N, 50, 12, 2_357);
const PEOPLE = A.map((a, i) => ({ a, b: B[i], sum: a + B[i] }));

const BAR = 112;
const ADMITTED = PEOPLE.filter((d) => d.sum >= BAR);

const corr = (rows, x, y) => {
  const mx = mean(rows.map((d) => d[x]));
  const my = mean(rows.map((d) => d[y]));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (const d of rows) {
    num += (d[x] - mx) * (d[y] - my);
    dx += (d[x] - mx) ** 2;
    dy += (d[y] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
};
const R_ALL = corr(PEOPLE, "a", "b");
const R_IN = corr(ADMITTED, "a", "b");

const DOM = [12, 88];
const ALL = panel(0, { x: DOM, y: DOM });
const IN = panel(1, { x: DOM, y: DOM });

const pts = (p, rows) => rows.map((d) => ({ ...d, x: p.px(d.a), y: p.py(d.b) }));
const cutLine = (p) =>
  [
    { a: BAR - DOM[1], b: DOM[1] },
    { a: DOM[1], b: BAR - DOM[1] },
  ].map((d) => ({ x: p.px(Math.max(DOM[0], Math.min(DOM[1], d.a))), y: p.py(Math.max(DOM[0], Math.min(DOM[1], d.b))) }));

export const caption = `On the left, ability and interview score are independent: the cloud is round and the correlation is ${R_ALL.toFixed(2)}. That is the truth about this world. The admissions rule adds the two together and takes everyone above a bar, and among the ${ADMITTED.length} people who got in the correlation is ${R_IN.toFixed(2)}. Nothing happened to anybody. The relationship is manufactured by the selection, and the mechanism is plain once said: among those admitted, a weak interview implies strong ability, because otherwise they would not have cleared the bar. Cutting one corner off a round cloud leaves a diagonal band. This is Berkson's paradox, and it is why "among our customers", "among hospital patients", "among people who replied" and "among successful startups" should all make you ask what got somebody into the dataset. The classic medical case is two unrelated diseases appearing correlated among inpatients, because having either is a reason to be admitted. Keep it separate from confounding, because the fixes point opposite ways: a confounder is a common cause and adding it to the model helps, while this is caused by conditioning on a common *effect*, and adding the selection variable makes it worse.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 42,
    marginRight: 20,
    marginBottom: 48,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(ALL, { ticks: [20, 40, 60, 80] }),
      ...panelAxis(IN, { ticks: [20, 40, 60, 80] }),
      panelTitle(ALL, `Everyone: r = ${R_ALL.toFixed(2)}`, { fill: PRIMARY }),
      panelTitle(IN, `Admitted only: r = ${R_IN.toFixed(2)}`, { fill: ACCENT }),

      Plot.dot(pts(ALL, PEOPLE), {
        x: "x",
        y: "y",
        r: 2.6,
        fill: (d) => (d.sum >= BAR ? ACCENT : MUTED),
        fillOpacity: (d) => (d.sum >= BAR ? 0.7 : 0.3),
      }),
      Plot.line(cutLine(ALL), { x: "x", y: "y", stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.dot(pts(IN, ADMITTED), { x: "x", y: "y", r: 2.8, fill: ACCENT, fillOpacity: 0.75 }),
      Plot.line(cutLine(IN), { x: "x", y: "y", stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),

      Plot.text([{}], {
        x: ALL.px(26),
        y: ALL.py(24),
        text: () => "this corner is\nthe one removed",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      ...[ALL, IN].map((p, k) =>
        Plot.text([{}], {
          x: (p.left + p.right) / 2,
          y: p.bottom,
          text: () => (k === 0 ? "ability, all applicants" : "ability, admitted applicants"),
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 20,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: IN.px(70),
        y: IN.py(78),
        text: () => "a band, not a cloud",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
