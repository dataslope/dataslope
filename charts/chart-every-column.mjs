/**
 * What a thirty-second sweep of every numeric column actually catches.
 *
 * The step is "chart every numeric column", and `histogram-bin-width` is the
 * wrong figure for it: that one is about tuning a single histogram, which is
 * work you do *after* deciding a column is interesting. This is the pass
 * before, where you are not tuning anything and are looking for the four or
 * five shapes that mean "stop and deal with me".
 *
 * All five rows are real defects that a `describe()` table hides and a picture
 * does not: missing values coded as zero, so a spike sits at the bottom of an
 * otherwise sensible spread; two populations in one column; a heavy tail that
 * will drag any mean you compute; and a column that is very nearly constant and
 * carries no information at all. The fifth is the control, an ordinary column,
 * because a sweep that only ever shows problems teaches nothing about what fine
 * looks like.
 *
 * Every column is scaled to its own range, which the axis label says outright.
 * Facets share scales in Plot, and these columns are in different units, so the
 * alternative to normalising would be five separate charts or one chart whose
 * shared axis flattened four rows to make room for the fifth. Shape is what
 * this pass is reading anyway; the values come later.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Five numeric columns drawn as stacked strips of points, each scaled to its own range. One has a tall spike at zero away from the rest of its values, one splits into two separate clumps, one bunches at the left with a long thin tail to the right, one is a single tight clump, and one is an ordinary even spread.";

const N = 160;
const u = rng(9090);
function gauss() {
  const a = Math.max(u(), Number.EPSILON);
  const b = u();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

const COLUMNS = [
  {
    key: "signup_age",
    verdict: "ordinary",
    ok: true,
    raw: () => Array.from({ length: N }, () => 34 + gauss() * 9),
  },
  {
    key: "days_since_login",
    verdict: "missing coded as 0",
    ok: false,
    // One in five rows never logged in and was written as a zero rather than a
    // null, which is the commonest silent corruption in a real table.
    raw: () => Array.from({ length: N }, (_, i) => (i % 5 === 0 ? 0 : 40 + gauss() * 12)),
  },
  {
    key: "session_minutes",
    verdict: "two populations",
    ok: false,
    raw: () => Array.from({ length: N }, (_, i) => (i % 2 ? 8 : 46) + gauss() * 3.4),
  },
  {
    key: "order_value",
    verdict: "heavy tail",
    ok: false,
    raw: () => Array.from({ length: N }, () => Math.exp(2.6 + Math.abs(gauss()) * 1.15)),
  },
  {
    key: "api_version",
    verdict: "almost constant",
    ok: false,
    raw: () => Array.from({ length: N }, (_, i) => (i % 40 === 0 ? 3 : 2)),
  },
];

/** Each column onto its own 0-1 range, because the five are in five different
 *  units and a shared facet scale would flatten four of them. */
const ROWS = COLUMNS.flatMap((c) => {
  const vals = c.raw();
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  return vals.map((v) => ({
    key: c.key,
    ok: c.ok,
    x: (v - lo) / span,
    j: (u() - 0.5) * 0.6,
  }));
});

const ORDER = COLUMNS.map((c) => c.key);
const PROBLEMS = COLUMNS.filter((c) => !c.ok).length;

export const caption = `Five columns from one table, each scaled to its own range so the five shapes can sit on one axis. Four of them are carrying a defect that a summary table reports as a perfectly reasonable set of numbers: a fifth of one column is missing and was written as zero, one is two populations that want splitting before anything is averaged, one has a tail heavy enough that its mean is not a typical value, and one is very nearly a constant. None of that survives a glance at the picture, which is the entire argument for making this pass a habit. It costs one line and it catches ${PROBLEMS} problems here.`;

export function render() {
  return plot({
    height: 380,
    marginTop: 20,
    marginLeft: 132,
    marginRight: 158,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Each column scaled to its own range",
      labelAnchor: "center",
      domain: [-0.03, 1.03],
      ticks: [],
    },
    y: { label: null, domain: [-0.5, 0.5], ticks: [], grid: false },
    fy: { domain: ORDER, label: null, axis: null },
    marks: [
      Plot.dot(ROWS, {
        x: "x",
        y: "j",
        fy: "key",
        r: 2.1,
        fill: (d) => (d.ok ? PRIMARY : ACCENT),
        fillOpacity: 0.55,
      }),
      // Column names on the left, where a dataframe would print them.
      Plot.text(COLUMNS, {
        x: () => -0.03,
        y: () => 0,
        fy: "key",
        text: (d) => d.key,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -12,
        ...HALO,
      }),
      // The reading, on the right, so the row is a finding rather than a shape
      // the reader has to name for themselves.
      Plot.text(COLUMNS, {
        x: () => 1.03,
        y: () => 0,
        fy: "key",
        text: (d) => d.verdict,
        fill: (d) => (d.ok ? PRIMARY : ACCENT),
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 12,
        ...HALO,
      }),
    ],
  });
}
