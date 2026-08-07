/**
 * Survivorship bias, drawn as the thing it actually is: a histogram with a
 * piece cut off, and a mean computed from what is left.
 *
 * The full population is every fund launched in a decade. The observed
 * population is the ones still reporting at the end, which is not a random
 * subset: the worst performers closed. Averaging the survivors gives a number
 * that is true about the survivors and false about the decision anyone is
 * using it to make.
 *
 * Both means are computed from the same sample, so the gap in the caption is
 * the gap in the drawing.
 *
 * The same shape covers the WWII bomber story, "successful founders dropped
 * out", and every backtest built on today's index membership.
 */
import { Plot, plot, linspace, mean, normalSamples, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A histogram of returns for every fund launched, with the loss-making left tail shaded as the funds that closed; the average of the survivors sits well to the right of the average of all of them.";

const ALL = normalSamples(3000, 4.5, 9, 8080);
/** Anything that lost more than this over the decade shut down and stopped
 *  reporting, which is the only reason it is missing from the data. */
const CLOSED_BELOW = -3;
const SURVIVORS = ALL.filter((v) => v >= CLOSED_BELOW);

const ALL_MEAN = mean(ALL);
const SURV_MEAN = mean(SURVIVORS);
const CLOSED_SHARE = Math.round(((ALL.length - SURVIVORS.length) / ALL.length) * 100);

export const caption =
  `Every fund launched averaged ${ALL_MEAN.toFixed(1)}% a year. The ones still open at the end averaged ${SURV_MEAN.toFixed(1)}%, because the ${CLOSED_SHARE}% that closed took their losses out of the sample with them. The second number is correct about survivors and useless for deciding whether to invest.`;

const DOMAIN = [-30, 38];
const THRESHOLDS = linspace(DOMAIN[0], DOMAIN[1], 35);
const points = ALL.map((v) => ({ v, survived: v >= CLOSED_BELOW }));

export function render() {
  return plot({
    height: 340,
    marginTop: 40,
    marginLeft: 56,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Annual return (%)", labelAnchor: "center", domain: DOMAIN, ticks: 6 },
    y: { label: "Funds", ticks: 5 },
    marks: [
      Plot.rectY(
        points,
        Plot.binX(
          { y: "count" },
          {
            x: "v",
            thresholds: THRESHOLDS,
            fill: (d) => (d.survived ? PRIMARY : MUTED),
            fillOpacity: (d) => (d.survived ? 0.45 : 0.28),
          },
        ),
      ),
      Plot.ruleX([CLOSED_BELOW], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: CLOSED_BELOW,
        y: 0,
        text: () => `${CLOSED_SHARE}% closed and\nstopped reporting`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -8,
        dy: -60,
        ...HALO,
      }),
      Plot.ruleX([ALL_MEAN], { stroke: MUTED, strokeWidth: 2 }),
      Plot.ruleX([SURV_MEAN], { stroke: ACCENT, strokeWidth: 2 }),
      Plot.text([{}], {
        x: ALL_MEAN,
        y: 0,
        text: () => `all funds\n${ALL_MEAN.toFixed(1)}%`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -6,
        dy: -222,
        ...HALO,
      }),
      Plot.text([{}], {
        x: SURV_MEAN,
        y: 0,
        text: () => `survivors only\n${SURV_MEAN.toFixed(1)}%`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 6,
        dy: -222,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
