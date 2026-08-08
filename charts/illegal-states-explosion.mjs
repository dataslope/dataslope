/**
 * "Make illegal states unrepresentable", counted.
 *
 * A record of optional booleans and nullable fields has 2ⁿ representable
 * states, and a domain almost never has 2ⁿ meanings. A request that is
 * `{ loading?, data?, error? }` can represent eight combinations, of which
 * three are the ones anybody meant; the other five are things like "loading
 * and errored and holding data", which every consumer must either handle or
 * quietly assume away. Those assumptions are where the bugs live, because they
 * are invisible: nothing in the type says the state is impossible.
 *
 * A discriminated union of the states that actually exist has exactly as many
 * inhabitants as there are states, so the flat line is not a smaller number,
 * it is a different quantity: the compiler now counts the same thing the
 * domain does, and `switch` over the tag is exhaustive by construction.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Representable states against the number of optional fields, on a logarithmic scale. The flag-based record doubles with every field while a discriminated union stays flat at the number of states the domain actually has.";

const MAX_FIELDS = 10;
const REAL_STATES = 4;
const AT = 3;

const rows = Array.from({ length: MAX_FIELDS + 1 }, (_, n) => [
  { key: "Optional flags on one record", n, states: Math.pow(2, n) },
  { key: "A discriminated union", n, states: REAL_STATES },
]).flat();

export const caption = `A record of \`n\` optional fields can represent 2ⁿ states, and no domain has 2ⁿ meanings. At ${AT} flags that is ${Math.pow(2, AT)} combinations for a request that really has ${REAL_STATES}: loading, loaded, failed, idle. The other ${Math.pow(2, AT) - REAL_STATES} are things like "loading and errored and holding data", which every consumer has to handle or silently assume away, and the assumption is invisible because nothing in the type rules it out. A discriminated union has exactly as many inhabitants as the domain has states, which is what makes a \`switch\` over the tag exhaustive.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 24,
    marginLeft: 66,
    marginRight: 168,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Optional fields on the record", labelAnchor: "center", domain: [0, MAX_FIELDS], ticks: 6 },
    y: {
      label: "Representable states",
      type: "log",
      domain: [0.9, 1400],
      ticks: [1, 10, 100, 1000],
    },
    marks: [
      Plot.line(rows.filter((d) => d.key.startsWith("Optional")), {
        x: "n",
        y: "states",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((d) => !d.key.startsWith("Optional")), {
        x: "n",
        y: "states",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.ruleX([AT], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.dot([{}], { x: AT, y: Math.pow(2, AT), fill: ACCENT, r: 4 }),
      Plot.text([{}], {
        x: AT,
        y: Math.pow(2, AT),
        text: () => `3 flags: ${Math.pow(2, AT)} states,\n${REAL_STATES} of them real`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -10,
        dy: -14,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MAX_FIELDS,
        y: Math.pow(2, MAX_FIELDS),
        text: () => "Optional flags\non one record",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MAX_FIELDS,
        y: REAL_STATES,
        text: () => "A discriminated union",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
    ],
  });
}
