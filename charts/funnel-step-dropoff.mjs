/**
 * A funnel, and the reason step conversion is computed at all.
 *
 * Read down the bars and the answer looks obvious: the first step loses more
 * people than any other, by a wide margin, so that is where the work is. Read
 * the percentages beside them and it is a different step. The top of a funnel
 * always loses the most users because it is where the users are, so ranking
 * steps by *how many* dropped is close to ranking them by how much traffic
 * they saw.
 *
 * Dividing each stage by the one above it removes the volume and leaves the
 * thing you can act on: how leaky this step is, given the people who reached
 * it. Here that moves the answer from "landing page" to "add to cart", which
 * keeps only half of the users who get there.
 *
 * The counts are the first six stages of the funnel in this page's SQL
 * challenge, so the figure and the query describe the same shop.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Six funnel stages as horizontal bars, from 42,000 landing-page visitors down to 3,900 purchases, each labelled with the share of the previous stage that reached it. The first step loses the most users; the worst step conversion is the next one, where only half of the visitors who view a product add it to the cart.";

const STAGES = [
  { key: "Landing page", users: 42000 },
  { key: "Product view", users: 27500 },
  { key: "Add to cart", users: 14200 },
  { key: "Checkout started", users: 8900 },
  { key: "Payment entered", users: 5100 },
  { key: "Purchase", users: 3900 },
];

const ROWS = STAGES.map((s, i) => {
  const prev = i === 0 ? null : STAGES[i - 1].users;
  return {
    ...s,
    i,
    lost: prev === null ? null : prev - s.users,
    step: prev === null ? null : s.users / prev,
  };
});

const STEPS = ROWS.filter((d) => d.step !== null);
/** The two answers the two ways of ranking give. */
const WORST_RATE = STEPS.reduce((lo, d) => (d.step < lo.step ? d : lo));
const BIGGEST_LOSS = STEPS.reduce((hi, d) => (d.lost > hi.lost ? d : hi));

/** Right edge of the bar domain; the step-conversion column hangs off it. */
const X_MAX = 44000;

const fmt = (n) => n.toLocaleString("en-US");
const pct = (v) => `${(v * 100).toFixed(0)}%`;

export const caption = `The same shop as this page's SQL challenge. Ranked by users lost, the answer is ${BIGGEST_LOSS.key} at ${fmt(BIGGEST_LOSS.lost)}, and it will almost always be the top of the funnel, because that is where the users are. Ranked by step conversion, which divides each stage by the one above it and so takes the volume out, the answer is **${WORST_RATE.key}**: ${pct(WORST_RATE.step)} of the people who got there went on, against ${pct(BIGGEST_LOSS.step)} at the step that lost more of them. Overall conversion is ${pct(ROWS.at(-1).users / ROWS[0].users)}, which tells you the funnel is worth fixing and nothing about where.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 22,
    marginLeft: 118,
    marginRight: 104,
    marginBottom: 40,
    ariaLabel: title,
    x: { label: "Users reaching the stage", labelAnchor: "center", domain: [0, X_MAX], ticks: 3, tickFormat: (d) => `${d / 1000}k` },
    y: { label: null, domain: STAGES.map((s) => s.key), padding: 0.3 },
    marks: [
      Plot.barX(ROWS, {
        x: "users",
        y: "key",
        fill: (d) => (d.key === WORST_RATE.key ? ACCENT : PRIMARY),
        fillOpacity: (d) => (d.key === WORST_RATE.key ? 0.75 : 0.55),
      }),
      Plot.text(ROWS, {
        x: "users",
        y: "key",
        text: (d) => fmt(d.users),
        fill: "currentColor",
        fillOpacity: 0.7,
        fontSize: 10.5,
        textAnchor: "start",
        dx: 8,
      }),
      // Step conversion as its own right-hand column, headed once. Two marks
      // because `fontWeight` is a constant option in Plot, not a channel.
      ...[
        { rows: STEPS.filter((d) => d.key !== WORST_RATE.key), fill: MUTED, weight: 600 },
        { rows: STEPS.filter((d) => d.key === WORST_RATE.key), fill: ACCENT, weight: 700 },
      ].map(({ rows, fill, weight }) =>
        Plot.text(rows, {
          x: X_MAX,
          y: "key",
          text: (d) => pct(d.step),
          fill,
          fontWeight: weight,
          fontSize: 11,
          textAnchor: "start",
          dx: 26,
        }),
      ),
      Plot.text([STAGES[0]], {
        x: X_MAX,
        y: "key",
        text: () => "step\nconversion",
        fill: MUTED,
        fontSize: 10,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 12,
        dy: -30,
      }),
      Plot.text([{ key: "Checkout started" }], {
        x: 19000,
        y: "key",
        text: () => `the top of a funnel always loses the most\nusers, because that is where the users are;\nthe leakiest step is the one in red`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "start",
        dy: -6,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
