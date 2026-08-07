/**
 * The four SQL isolation levels and the three anomalies they are defined by,
 * as the grid the standard actually is.
 *
 * Each level is a promise about which anomalies cannot happen, and nothing
 * else. Reading down a column shows what a given anomaly costs you; reading
 * across a row shows what a level buys. The important cell is the one people
 * are surprised by: repeatable read still permits phantoms, which is why
 * serializable exists as a separate level rather than as the top of a smooth
 * scale.
 *
 * The counts in the caption are computed from the grid, so the "two of three"
 * claim is the table rather than a summary of it.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "A grid of four isolation levels against three anomalies, marking which are possible at each level. Read uncommitted permits all three, serializable none, and repeatable read still permits phantom reads.";

const LEVELS = ["Read uncommitted", "Read committed", "Repeatable read", "Serializable"];
const ANOMALIES = ["Dirty read", "Non-repeatable read", "Phantom read"];

/** Possible[level][anomaly] per the SQL standard. */
const POSSIBLE = {
  "Read uncommitted": [true, true, true],
  "Read committed": [false, true, true],
  "Repeatable read": [false, false, true],
  Serializable: [false, false, false],
};

const cells = LEVELS.flatMap((level) =>
  ANOMALIES.map((anomaly, i) => ({ level, anomaly, possible: POSSIBLE[level][i] })),
);

const RR = POSSIBLE["Repeatable read"].filter(Boolean).length;
const OK = SERIES[2];

export const caption =
  `Each level is a promise about which anomalies cannot happen, and nothing more. Repeatable read prevents ${ANOMALIES.length - RR} of the ${ANOMALIES.length} and still permits phantoms, which is the cell that surprises people and the reason serializable is a separate level rather than the top of a scale. Postgres and MySQL both differ from the standard here; check what your engine actually gives you.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 44,
    marginLeft: 152,
    marginRight: 24,
    marginBottom: 30,
    ariaLabel: title,
    x: { label: null, domain: ANOMALIES, axis: "top", padding: 0.06 },
    y: { label: null, domain: LEVELS, padding: 0.06 },
    marks: [
      Plot.cell(cells, {
        x: "anomaly",
        y: "level",
        fill: (d) => (d.possible ? ACCENT : OK),
        fillOpacity: (d) => (d.possible ? 0.28 : 0.22),
      }),
      Plot.text(cells, {
        x: "anomaly",
        y: "level",
        text: (d) => (d.possible ? "possible" : "prevented"),
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        ...HALO,
      }),
      // The cell the lesson is about, called out beside the grid rather than
      // inside it: a second label in the same cell just overprints the first.
      Plot.text([{ anomaly: "Phantom read", level: "Repeatable read" }], {
        x: "anomaly",
        y: "level",
        text: () => "the surprising one",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        dy: 18,
        ...HALO,
      }),
    ],
  });
}
