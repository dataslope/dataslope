/**
 * Why a type error at 3pm on a Tuesday is the cheapest bug you will ever have.
 *
 * The cost of a defect is not the cost of the fix; it is the cost of the fix
 * plus everything that happened between writing it and finding it. Caught by
 * the editor, nothing happened: the author still has the whole problem in their
 * head and the change is one keystroke. Caught in production, the same defect
 * has cost an incident channel, a rollback, a customer, and a context switch
 * for someone who last saw that file in March.
 *
 * The multipliers here are the shape everyone measures rather than any one
 * study's numbers, which vary by an order of magnitude depending on what is
 * counted. What is not in dispute is that the axis is logarithmic, and that
 * the first two bars are the ones a type system moves work into.
 *
 * Bossavit is in the sources deliberately. The single most-reproduced version
 * of this chart, a table of 1x/6.5x/15x/100x attributed to an "IBM Systems
 * Sciences Institute", is one of the leprechauns his book chases: it is cited
 * everywhere and traces back to no published study anyone can find. Citing the
 * critique next to the measurements is what earns the caption's hedge, and it
 * is why the bars here are drawn as a shape rather than as four decimals.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Relative cost of fixing one defect by the stage that catches it, on a logarithmic scale: near-free in the editor and at compile time, then rising through review, CI and staging to roughly a hundred times as much in production.";

const STAGES = [
  { key: "In the editor", cost: 1, note: "the author is still holding it" },
  { key: "At compile time", cost: 2, note: "before it is even committed" },
  { key: "In code review", cost: 6, note: "someone else's afternoon" },
  { key: "In CI", cost: 12, note: "a red build, a context switch" },
  { key: "In staging", cost: 30, note: "a triage, a re-deploy" },
  { key: "In production", cost: 100, note: "an incident, and a customer saw it" },
];

const MAX = STAGES.at(-1).cost;

export const caption = `The cost of a defect is the fix plus everything that happened between writing it and finding it, which is why the axis is logarithmic. A static type checker does not catch every bug; what it does is move a whole class of them from the right-hand end of this chart to the left-hand end, where a fix costs a keystroke and no one else's day. The multipliers vary by an order of magnitude between studies; the shape does not.`;

export const sources = [
  {
    text: "Boehm, *Software Engineering Economics* (Prentice Hall, 1981)",
    href: "https://openlibrary.org/works/OL6034830W",
  },
  {
    text: "RTI for NIST, *The Economic Impacts of Inadequate Infrastructure for Software Testing*, Planning Report 02-3 (2002)",
    href: "https://www.nist.gov/document/report02-3pdf",
  },
  {
    text: "Bossavit, *The Leprechauns of Software Engineering* (2015), on their provenance",
    href: "https://leanpub.com/leprechauns",
  },
];

export function render() {
  return plot({
    height: 320,
    marginTop: 24,
    marginLeft: 128,
    marginRight: 190,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Relative cost of the fix",
      labelAnchor: "center",
      type: "log",
      domain: [0.8, 160],
      ticks: [1, 10, 100],
      tickFormat: (d) => `${d}×`,
    },
    y: { label: null, domain: STAGES.map((d) => d.key), padding: 0.3, grid: false },
    marks: [
      Plot.barX(STAGES, {
        y: "key",
        x1: 0.8,
        x2: "cost",
        fill: (d) => (d.cost >= MAX ? ACCENT : PRIMARY),
        fillOpacity: (d) => 0.3 + 0.45 * (Math.log(d.cost) / Math.log(MAX)),
      }),
      Plot.text(STAGES, {
        y: "key",
        x: "cost",
        text: (d) => `${d.cost}×\n${d.note}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
    ],
  });
}
