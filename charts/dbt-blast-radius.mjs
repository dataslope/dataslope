/**
 * What the lineage DAG is actually for: knowing what a change breaks before
 * you ship it.
 *
 * `ref()` is usually explained as "it resolves the schema for you", which is
 * the least interesting half. The important half is that it builds a graph, and
 * a graph turns "what does this change affect?" from a conversation into a
 * selector. `dbt build --select my_model+` runs exactly the models downstream
 * of a change, and the count depends entirely on where in the layering that
 * change lands.
 *
 * A staging model sits under everything, so editing one is a near-total
 * rebuild; a mart sits at the leaves, so editing one is a rebuild of itself.
 * That asymmetry is the argument for the layering in the first place: it puts
 * the models that change weekly (business logic in marts) where changing them
 * is cheap, and the models that change rarely (source-shaped staging) where
 * changing them is expensive.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Models rebuilt by a downstream selector when one model changes, by the layer the change lands in. Editing a staging model rebuilds most of the project; editing a mart rebuilds a handful.";

const TOTAL = 120;

const LAYERS = [
  { key: "A source's staging model", n: 96, note: "everything sits on it" },
  { key: "An intermediate model", n: 34, note: "a subtree" },
  { key: "A mart model", n: 6, note: "itself and its exposures" },
  { key: "A mart's final column", n: 1, note: "itself" },
];

const rows = LAYERS.map((d) => ({ ...d, share: d.n / TOTAL }));

export const caption = `A ${TOTAL}-model project, and the count \`dbt build --select the_model+\` would run. The layering is what makes those numbers differ: staging models are source-shaped and change rarely, so it is acceptable that changing one is a near-total rebuild, and marts carry the business logic that changes weekly, where a rebuild is six models. Getting that the wrong way round is how a project ends up rebuilding everything for every pull request.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 30,
    marginLeft: 186,
    marginRight: 156,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: `Models rebuilt (of ${TOTAL})`, labelAnchor: "center", domain: [0, TOTAL], ticks: 5 },
    y: { label: null, domain: LAYERS.map((d) => d.key), padding: 0.3, grid: false },
    marks: [
      Plot.barX(rows, {
        y: "key",
        x: "n",
        fill: (d) => (d.n > TOTAL / 2 ? ACCENT : PRIMARY),
        fillOpacity: 0.7,
      }),
      // Count and reason together in the right margin. Inside the bar the
      // note sat on a filled ground at two different opacities and lost its
      // contrast on the widest row, which is the one worth reading.
      Plot.text(rows, {
        y: "key",
        x: "n",
        text: (d) => `${d.n} of ${TOTAL}\n${d.note}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
