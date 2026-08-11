/**
 * A flow and a stock, resampled both ways, with two right answers that are
 * opposites.
 *
 * `resample("M")` needs an aggregation, and the choice is not a matter of
 * preference. It follows from what kind of quantity the column is, and there
 * are exactly two kinds.
 *
 * A **flow** is measured *over* an interval: orders placed, rainfall,
 * kilowatt-hours, revenue. Flows are additive across time, so the month's
 * value is the sum of the days' values, and taking the mean answers a
 * different, usually uninteresting question ("orders per day"), while also
 * making January and February incomparable for a reason that has nothing to do
 * with the business.
 *
 * A **stock** is measured *at* an instant: inventory on hand, account balance,
 * headcount, temperature. Stocks are not additive at all, and summing one
 * produces a number with no referent: the sum of thirty daily inventory levels
 * is not inventory in any unit anybody uses. The month's value is a mean, or a
 * last, or a max, depending on what the month is meant to represent.
 *
 * The mistake is easy to miss because both operations succeed and both return
 * a plausible-looking series. The tell is the axis: a summed stock has a value
 * about thirty times the daily figure, so if the monthly chart's numbers are
 * roughly a month's worth larger than the daily chart's, and the quantity is
 * something you could photograph at a moment in time, the aggregation is
 * wrong.
 *
 * The rule that covers almost everything: **if the units contain "per", it is
 * a flow and you sum; if you could measure it with a snapshot, it is a stock
 * and you do not.**
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Daily orders (a flow) and daily inventory (a stock) resampled to monthly by both sum and mean. Summing the flow is right and summing the stock produces a number thirty times too large with no meaning; the mean is right for the stock and answers the wrong question for the flow.";

const DAYS = 90;
const MONTHS = 3;
const PER_MONTH = DAYS / MONTHS;
const u = rng(9_402);

const ORDERS = Array.from({ length: DAYS }, (_, i) => 120 + 30 * Math.sin(i / 14) + (u() - 0.5) * 40);
const INVENTORY = Array.from({ length: DAYS }, (_, i) => 900 + 120 * Math.sin(i / 21) + (u() - 0.5) * 90);

const monthly = (series, how) =>
  Array.from({ length: MONTHS }, (_, m) => {
    const slice = series.slice(m * PER_MONTH, (m + 1) * PER_MONTH);
    const total = slice.reduce((s, v) => s + v, 0);
    return how === "sum" ? total : total / slice.length;
  });

const SERIES = [
  {
    key: "Orders placed",
    kind: "flow",
    daily: ORDERS,
    right: "sum",
    note: "additive across time",
  },
  {
    key: "Inventory on hand",
    kind: "stock",
    daily: INVENTORY,
    right: "mean",
    note: null, // filled in below, once the blow-up factor is known
  },
].map((s) => ({ ...s, sum: monthly(s.daily, "sum"), mean: monthly(s.daily, "mean") }));

const [FLOW, STOCK] = SERIES;
const BLOWUP = Math.round(STOCK.sum[0] / STOCK.mean[0]);

const PANELS = SERIES.map((_, k) => panel(k, { y: [0, 1] }));

/** Both aggregations for one series, on a shared log-ish pair of rows so the
 *  thirty-fold difference is legible without either bar vanishing. */
const rowsFor = (s, p) => {
  const both = [
    { how: "sum", values: s.sum },
    { how: "mean", values: s.mean },
  ];
  // Each row is scaled to its own maximum. Sharing one scale would draw the
  // mean row as hairlines, which is true and unreadable; the numbers printed
  // on the bars carry the thirty-fold difference instead.
  return both.flatMap((b, r) =>
    b.values.map((v, m) => {
      const y0 = r === 0 ? 0.56 : 0.16;
      const h = 0.26 * (v / Math.max(...b.values));
      const w = (p.right - p.left) / 3.6;
      const cx = p.left + (p.right - p.left) * ((m + 0.5) / MONTHS);
      return {
        how: b.how,
        right: b.how === s.right,
        v,
        x1: cx - w / 2,
        x2: cx + w / 2,
        y1: y0,
        y2: y0 + h,
        cx,
        top: y0 + h,
      };
    }),
  );
};

export const caption = `Resampling needs an aggregation, and the choice follows from what kind of quantity the column is. There are exactly two kinds. A flow is measured *over* an interval: orders, rainfall, kilowatt-hours, revenue. Flows add across time, so the month is the sum of the days, and taking a mean answers a different and usually duller question while making a 28-day month incomparable with a 31-day one for reasons that have nothing to do with the business. A stock is measured *at* an instant: inventory, balance, headcount, temperature. Stocks do not add, and summing one produces a number with no referent, here about ${BLOWUP} times the daily figure, because thirty daily inventory levels added together are not inventory in any unit anyone uses. The month's value for a stock is a mean, or a last, or a max, depending on what the month is meant to stand for. The mistake survives because both operations succeed and both return a plausible series. The tell is the axis: if the monthly numbers are about a month's worth larger than the daily ones, and the quantity is something you could photograph at a moment in time, the aggregation is wrong. The rule that covers nearly everything: if the units contain "per", it is a flow and you sum; if you could measure it with a snapshot, it is a stock and you do not.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 26,
    marginRight: 20,
    marginBottom: 34,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...SERIES.flatMap((s, k) => {
        const p = PANELS[k];
        const rows = rowsFor(s, p);
        return [
          panelTitle(p, `${s.key} (a ${s.kind})`, { fill: k === 0 ? PRIMARY : ACCENT }),
          Plot.rect(rows, {
            x1: "x1",
            x2: "x2",
            y1: "y1",
            y2: "y2",
            fill: (d) => (d.right ? (k === 0 ? PRIMARY : ACCENT) : MUTED),
            fillOpacity: (d) => (d.right ? 0.75 : 0.3),
          }),
          Plot.text(rows, {
            x: "cx",
            y: "top",
            text: (d) => Math.round(d.v).toLocaleString(),
            fill: (d) => (d.right ? (k === 0 ? PRIMARY : ACCENT) : MUTED),
            fontSize: 10,
            fontWeight: 700,
            textAnchor: "middle",
            dy: -8,
            ...HALO,
          }),
          ...[
            { how: "sum", y: 0.56 },
            { how: "mean", y: 0.16 },
          ].map((r) =>
            Plot.text([{}], {
              x: p.left,
              y: r.y,
              text: () =>
                `resample("M").${r.how}()${r.how === s.right ? "  ✓" : ""}`,
              fill: r.how === s.right ? (k === 0 ? PRIMARY : ACCENT) : MUTED,
              fontSize: 10.5,
              fontWeight: 700,
              textAnchor: "start",
              dy: 14,
              ...HALO,
            }),
          ),
          Plot.text([{}], {
            x: p.left,
            y: 0.02,
            text: () => s.note ?? `not additive: that sum is ${BLOWUP}× too large, in no unit anybody uses`,
            fill: s.note ? MUTED : ACCENT,
            fontSize: 10,
            fontWeight: s.note ? 600 : 700,
            textAnchor: "start",
            ...HALO,
          }),
        ];
      }),
    ],
  });
}
