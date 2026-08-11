/**
 * Bertin's table of what each visual variable can do, and what a laboratory
 * said about it seventeen years later.
 *
 * Jacques Bertin's *Sémiologie graphique* (1967) is the first attempt to treat
 * the marks on a chart as a language with rules. He listed the properties of a
 * mark that can be varied independently of where it sits (he called them the
 * *retinal variables*) and then, for each one, asked four questions that have
 * nothing to do with taste:
 *
 *   • *selective*: can the eye pick out every mark of one value at once, as a
 *     group, without scanning? Hue is selective. Shape is not: finding all the
 *     triangles is a search, not a glance.
 *   • *associative*: can the variable be *ignored*, so that groups defined by
 *     some other variable still read as groups across it? Size fails this. A
 *     tiny mark and a huge one do not look like members of one family however
 *     you color them, which is why Bertin calls size *dissociative*.
 *   • *ordered*: does a reader agree, without being told, which value is more?
 *     Light to dark, yes. Red to green, no.
 *   • *quantitative*: can a reader say *how much* more, as a ratio? Only one
 *     of the six manages this.
 *
 * The last column is not Bertin's. It is where Cleveland and McGill's 1984
 * experiments, which actually measured how accurately people read each
 * encoding, ended up. The agreement is the striking part: Bertin got there by
 * reasoning about perception from a drawing board, and the two disagreements
 * are both about *orientation*, which he rated more highly than the lab did.
 *
 * The table is the point, so it is drawn as a table. A matrix of yes and no is
 * not made clearer by turning it into bars.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Bertin's six retinal variables in his 1967 order, scored on his four questions: selective, associative, ordered and quantitative. Size is the only one that is quantitative; shape is the only one that is not selective; hue, orientation and shape carry no order at all. A fifth column gives where Cleveland and McGill's 1984 accuracy experiments placed each variable.";

const PROPS = ["Selective", "Associative", "Ordered", "Quantitative"];
const ACCURACY = "Accuracy, 1984";
const COLUMNS = [...PROPS, ACCURACY];

/**
 * Bertin's own scoring, in his own order. `accuracy` is the later, separate
 * finding and is deliberately worded rather than scored: Cleveland and McGill
 * ranked *tasks* (judge a length, judge an angle), not Bertin's variables, so
 * a rank number here would be a false precision.
 */
const VARIABLES = [
  {
    name: "Size",
    Selective: true,
    Associative: false,
    Ordered: true,
    Quantitative: true,
    accuracy: "high",
    note: "length is read almost as well as position",
  },
  {
    name: "Value (lightness)",
    Selective: true,
    Associative: false,
    Ordered: true,
    Quantitative: false,
    accuracy: "low",
    note: "ordered, but nobody reads a ratio off a shade",
  },
  {
    name: "Texture",
    Selective: true,
    Associative: true,
    Ordered: true,
    Quantitative: false,
    accuracy: "not tested",
    note: "fell out of use with the printing press",
  },
  {
    name: "Color (hue)",
    Selective: true,
    Associative: true,
    Ordered: false,
    Quantitative: false,
    accuracy: "none",
    note: "names things; ranks nothing",
  },
  {
    name: "Orientation",
    Selective: true,
    Associative: true,
    Ordered: false,
    Quantitative: false,
    accuracy: "middling",
    note: "the lab rated slope higher than Bertin did",
  },
  {
    name: "Shape",
    Selective: false,
    Associative: true,
    Ordered: false,
    Quantitative: false,
    accuracy: "none",
    note: "finding all the triangles is a search",
  },
];

const ORDER = VARIABLES.map((d) => d.name);

const cells = VARIABLES.flatMap((v) =>
  PROPS.map((p) => ({ name: v.name, prop: p, yes: v[p] })),
);
const ranks = VARIABLES.map((v) => ({ name: v.name, prop: ACCURACY, accuracy: v.accuracy }));

const RANK_COLOR = { high: PRIMARY, middling: MUTED, low: MUTED, "not tested": MUTED, none: ACCENT };
const quantitative = VARIABLES.filter((d) => d.Quantitative).map((d) => d.name);
const unordered = VARIABLES.filter((d) => !d.Ordered).map((d) => d.name);

export const caption = `Bertin's four questions asked of six visual variables, with a fifth column that is not his: roughly where Cleveland and McGill's 1984 experiments on reading accuracy came out. Only ${quantitative.join(" and ").toLowerCase()} lets a reader say how much more, and ${unordered.length} of the six carry no order at all.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 46,
    marginLeft: 132,
    marginRight: 18,
    marginBottom: 26,
    ariaLabel: title,
    x: { axis: "top", label: null, domain: COLUMNS, padding: 0.06 },
    y: { label: null, domain: ORDER, padding: 0.1, grid: false },
    marks: [
      Plot.cell(cells, {
        x: "prop",
        y: "name",
        fill: (d) => (d.yes ? PRIMARY : MUTED),
        fillOpacity: (d) => (d.yes ? 0.24 : 0.07),
        inset: 2.5,
        rx: 3,
      }),
      // `fontWeight` is a constant option in Plot, not a channel, so the two
      // answers have to be two marks to be set in two weights.
      ...[true, false].map((yes) =>
        Plot.text(
          cells.filter((d) => d.yes === yes),
          {
            x: "prop",
            y: "name",
            text: () => (yes ? "yes" : "no"),
            fill: yes ? PRIMARY : MUTED,
            fontSize: 12,
            fontWeight: yes ? 700 : 500,
            textAnchor: "middle",
          },
        ),
      ),
      Plot.text(ranks, {
        x: "prop",
        y: "name",
        text: "accuracy",
        fill: (d) => RANK_COLOR[d.accuracy],
        fontSize: 12,
        fontWeight: 600,
        fontStyle: "italic",
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
