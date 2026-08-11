/**
 * Six frames of an animation laid out at once, and what the animation was
 * asking the viewer to do instead.
 *
 * An animated bubble chart is genuinely good at one thing: showing that a
 * process is continuous, that these points moved rather than being replaced.
 * That is worth having, and it is the only thing it is better at. Every
 * comparison across time in an animation is a memory task, because frame one
 * is gone by the time frame six arrives. Asking "which region improved most"
 * of a playing animation is asking the viewer to hold six scatter plots in
 * their head and subtract two of them.
 *
 * Small multiples turn the same frames into a comparison. All six are on the
 * page together, the eye moves rather than remembering, and the panel that
 * behaves differently, here the one region that goes backwards, is visible
 * without anyone being told to watch for it. Nobody spots that in playback.
 *
 * Animation also cannot be paused in a PDF, a screenshot, or a printed report,
 * and readers rarely replay. If the finding lives in the motion, it does not
 * survive the first time someone shares the chart.
 *
 * ── Why the axes are named ──────────────────────────────────────────────────
 *
 * The first version drew this with `x: { label: null, ticks: [] }` and a y axis
 * labelled only "Outcome". Six panels of dots trailing sideways across nothing
 * is not a chart a reader can enter: horizontal position was carrying half the
 * information and there was no way to find out what it meant, so "the one that
 * moves backwards" was a claim in the caption rather than something visible.
 *
 * Both axes now name a quantity and carry ticks, sparse ones, because a panel
 * here is about a hundred pixels wide and a third tick would collide with its
 * neighbours. The trails also moved from the blue guide token to the muted one:
 * at guide blue they read as a fifth series rather than as history.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Six frames of an animated scatter of spend per customer against retention, shown side by side as small multiples, one panel per year from 2000 to 2020. Each region's path so far is drawn faintly behind it, and the one region whose retention falls while every other rises is visible in a single glance.";

// Strings, not numbers: a numeric facet domain is formatted with a
// thousands separator, so the panels come out labelled "2,000".
const YEARS = ["2000", "2004", "2008", "2012", "2016", "2020"];

/** Five regions moving up and right over time, and one that does not. */
const REGIONS = [
  { key: "North", x0: 22, y0: 41, dx: 9.5, dy: 6.2 },
  { key: "South", x0: 34, y0: 33, dx: 7.1, dy: 8.0 },
  { key: "East", x0: 48, y0: 55, dx: 6.4, dy: 4.1 },
  { key: "West", x0: 15, y0: 62, dx: 11.2, dy: 3.4 },
  { key: "Central", x0: 61, y0: 47, dx: 4.6, dy: 5.8 },
  { key: "Delta", x0: 55, y0: 70, dx: 5.2, dy: -5.4 },
];

const BACKWARDS = REGIONS.find((r) => r.dy < 0);

const rows = YEARS.flatMap((year, t) =>
  REGIONS.map((r) => ({
    year,
    t,
    key: r.key,
    x: r.x0 + r.dx * t,
    y: r.y0 + r.dy * t,
    back: r.key === BACKWARDS.key,
  })),
);

/** The trail: every earlier position, drawn faintly in each later panel, which
 *  is the one thing animation gives for free and a static frame does not. */
const trails = YEARS.flatMap((year, t) =>
  REGIONS.flatMap((r) =>
    Array.from({ length: t + 1 }, (_, s) => ({
      year,
      key: r.key,
      s,
      x: r.x0 + r.dx * s,
      y: r.y0 + r.dy * s,
      back: r.key === BACKWARDS.key,
    })),
  ),
);

const DROP = Math.round(-BACKWARDS.dy * (YEARS.length - 1));

export const caption = `An animated bubble chart is genuinely better at one thing: showing that a process is continuous, that these points moved rather than being replaced. Everything else it asks of a viewer is a memory task, because the first frame is gone by the time the last one arrives. "Which region improved most" put to a playing animation asks someone to hold six scatter plots in their head and subtract two of them. Small multiples turn the same frames into a comparison: all six on the page, the eye moving instead of remembering, and ${BACKWARDS.key}, the one region that goes backwards by ${DROP} over the period, visible without anyone being told to watch for it. Nobody catches that in playback. Animation also cannot be paused in a PDF, a screenshot or a printed report, and readers rarely replay, so a finding that lives in the motion does not survive the first time the chart is shared.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 32,
    marginLeft: 50,
    marginRight: 18,
    marginBottom: 52,
    ariaLabel: title,
    fx: { label: null, domain: YEARS },
    // Two ticks, not three: a panel is about a hundred pixels wide here and a
    // third label runs into the neighbouring panel's first one.
    x: {
      label: "Spend per customer (£)",
      labelAnchor: "center",
      domain: [5, 115],
      ticks: [25, 75],
    },
    y: { label: "Retention (%)", domain: [10, 90], ticks: 3 },
    marks: [
      Plot.line(trails, {
        fx: "year",
        x: "x",
        y: "y",
        z: (d) => `${d.year}-${d.key}`,
        stroke: (d) => (d.back ? ACCENT : MUTED),
        strokeWidth: 1.1,
        strokeOpacity: (d) => (d.back ? 0.55 : 0.4),
        clip: true,
      }),
      Plot.dot(rows, {
        fx: "year",
        x: "x",
        y: "y",
        r: 4.6,
        fill: (d) => (d.back ? ACCENT : PRIMARY),
        fillOpacity: 0.85,
        clip: true,
      }),
      Plot.text(
        rows.filter((d) => d.back && d.t === YEARS.length - 1),
        {
          fx: "year",
          x: "x",
          y: "y",
          text: (d) => d.key,
          fill: ACCENT,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "end",
          dx: -7,
          ...HALO,
        },
      ),
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.09 }),
      Plot.text([{}], {
        fx: () => YEARS[0],
        frameAnchor: "bottom-left",
        text: () => "in playback you see one of these at a time",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 3,
        dy: -3,
        ...HALO,
      }),
    ],
  });
}
