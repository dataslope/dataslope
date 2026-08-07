/**
 * What quantisation buys and what it costs, which is the decision anyone
 * running a model locally has to make.
 *
 * Memory falls roughly in proportion to the bit width, so 4-bit weights are a
 * quarter of 16-bit ones and the difference is whether the model fits on the
 * card at all. Quality falls too, and not proportionally: the drop from 16 to
 * 8 bits is nearly free, 8 to 5 is small, and below 4 it falls away sharply.
 *
 * The shape is the point. There is a broad range where quantisation is close to
 * free and a cliff past it, so the right choice is usually the smallest width
 * before the cliff rather than the smallest available.
 *
 * The memory figures are exact arithmetic on the parameter count; the quality
 * curve is representative of published perplexity results rather than a
 * measurement, and the caption says so.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Memory and relative quality against weight precision for a seven-billion-parameter model. Memory falls in proportion to the bit width while quality holds nearly flat to about four bits and then drops sharply.";

const PARAMS = 7e9;
const WIDTHS = [16, 8, 6, 5, 4, 3, 2];

/** Representative relative quality: flat, then a cliff below four bits. */
const QUALITY = { 16: 1.0, 8: 0.999, 6: 0.995, 5: 0.99, 4: 0.975, 3: 0.9, 2: 0.66 };

const rows = WIDTHS.map((bits) => ({
  bits,
  gb: (PARAMS * bits) / 8 / 1e9,
  quality: QUALITY[bits],
}));

const FULL = rows[0];
const SWEET = rows.find((r) => r.bits === 4);

export const caption =
  `At ${FULL.bits}-bit weights this model needs ${FULL.gb.toFixed(0)}GB and will not fit on a consumer card. At ${SWEET.bits}-bit it needs ${SWEET.gb.toFixed(1)}GB and keeps ${(SWEET.quality * 100).toFixed(1)}% of the quality. Below that it falls away fast, so the useful choice is the smallest width before the cliff rather than the smallest offered. Memory here is exact arithmetic; the quality curve is representative of published results, not a measurement of your model.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 32,
    marginLeft: 62,
    marginRight: 138,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Bits per weight",
      labelAnchor: "center",
      domain: [2, 16],
      ticks: WIDTHS.length,
      reverse: true,
    },
    y: { label: "Memory (GB) and relative quality", domain: [0, 16], ticks: 5 },
    marks: [
      Plot.line(rows, { x: "bits", y: "gb", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.dot(rows, { x: "bits", y: "gb", fill: PRIMARY, r: 3.5 }),
      // Quality on the same frame, scaled to it and labelled as such.
      Plot.line(rows, { x: "bits", y: (d) => d.quality * 14, stroke: ACCENT, strokeWidth: 2 }),
      Plot.dot(rows, { x: "bits", y: (d) => d.quality * 14, fill: ACCENT, r: 3.5 }),
      Plot.ruleX([4], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([FULL], {
        x: "bits",
        y: "gb",
        text: (d) => `${d.gb.toFixed(0)} GB`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([SWEET], {
        x: "bits",
        y: "gb",
        text: (d) => `${d.gb.toFixed(1)} GB at ${d.bits}-bit`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        dy: 14,
        ...HALO,
      }),
      Plot.text([rows.at(-1)], {
        x: "bits",
        y: (d) => d.quality * 14,
        text: () => "quality falls off a cliff\nbelow four bits",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 15.6,
        y: 15.4,
        text: () => "blue: memory · red: relative quality",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
