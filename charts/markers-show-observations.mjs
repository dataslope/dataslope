/**
 * The same two series drawn bare and drawn with markers, where the markers are
 * the only thing that says how much was measured.
 *
 * A line is an assertion about the space between the points as well as about
 * the points, and a bare line makes that assertion invisibly. Both curves here
 * look equally well supported. One is a daily series with fifty-two
 * observations; the other is quarterly, with five, and its smooth run through
 * the middle of the year is entirely interpolation, drawn by the renderer
 * rather than measured by anyone.
 *
 * Markers cost one keyword and settle it. They also make the sampling
 * *irregular* visible when it is, which a bare line actively hides: evenly
 * spaced points and clustered ones produce the same line if the values happen
 * to match.
 *
 * The trade is clutter, and it is real. Past roughly fifty points markers
 * stop informing and start filling the line in, which is why dense series drop
 * them and sparse ones should not.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Two series drawn without markers and then with them. The bare lines look equally well supported; the markers show that one has fifty-two observations and the other has five.";

const WEEKS = 52;
const u = rng(6045);

const shape = (t) => 48 + 26 * Math.sin((t / WEEKS) * Math.PI * 1.15) + t * 0.18;

/** Weekly: measured every step. */
const dense = Array.from({ length: WEEKS }, (_, w) => ({
  key: "Weekly",
  t: w,
  v: shape(w) + (u() - 0.5) * 5,
}));

/** Quarterly: five observations, and the renderer draws the rest. */
const SPARSE_T = [0, 13, 26, 39, 51];
const sparse = SPARSE_T.map((t) => ({ key: "Quarterly", t, v: shape(t) - 13 }));

const BARE = "Without markers";
const MARKED = "With markers";

const rows = [BARE, MARKED].flatMap((panel) => [
  ...dense.map((d) => ({ ...d, panel })),
  ...sparse.map((d) => ({ ...d, panel })),
]);

const colorOf = (key) => (key === "Quarterly" ? ACCENT : PRIMARY);
const GAP = SPARSE_T[2] - SPARSE_T[1];

export const caption = `A line asserts something about the space between the points as well as about the points, and a bare line makes that assertion invisibly. Both curves on the left look equally well supported. One has ${dense.length} weekly observations; the other has ${sparse.length} quarterly ones, and its smooth run through the middle of the year is ${GAP} weeks of interpolation drawn by the renderer rather than measured by anyone. Markers cost one keyword and settle it, and they also expose irregular sampling, which a bare line hides completely: evenly spaced and clustered observations draw the same line when the values agree. The trade is clutter and it is real. Past roughly fifty points markers stop informing and start filling the line in, which is why dense series drop them and sparse ones should not.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 46,
    marginRight: 76,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: [BARE, MARKED] },
    x: { label: "Week", labelAnchor: "center", domain: [0, WEEKS - 1], ticks: 4 },
    y: { label: "Index", domain: [0, 96], ticks: 4 },
    marks: [
      Plot.line(rows, {
        fx: "panel",
        x: "t",
        y: "v",
        z: (d) => `${d.panel}-${d.key}`,
        stroke: (d) => colorOf(d.key),
        strokeWidth: 1.9,
      }),
      Plot.dot(
        rows.filter((d) => d.panel === MARKED),
        {
          fx: "panel",
          x: "t",
          y: "v",
          r: (d) => (d.key === "Quarterly" ? 4.2 : 2.2),
          fill: (d) => colorOf(d.key),
        },
      ),
      Plot.text([{ t: SPARSE_T.at(-1), v: sparse.at(-1).v }], {
        fx: () => MARKED,
        x: "t",
        y: "v",
        text: () => `Quarterly\n${sparse.length} points`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{ t: SPARSE_T.at(-1), v: dense.at(-1).v }], {
        fx: () => MARKED,
        x: "t",
        y: "v",
        text: () => `Weekly\n${dense.length} points`,
        fill: PRIMARY,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        fx: () => BARE,
        frameAnchor: "bottom-left",
        text: () => "two lines, no idea which is measured",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 4,
        dy: -4,
        ...HALO,
      }),
    ],
  });
}
