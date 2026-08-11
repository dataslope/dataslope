/**
 * The scatter plot that invented a taxonomy instead of illustrating one.
 *
 * Around 1911 Ejnar Hertzsprung and, independently, Henry Norris Russell
 * plotted two things astronomers had been measuring separately for decades:
 * how hot a star's surface is, and how much light it puts out. Nobody expected
 * structure. Every star was a star.
 *
 * What came out is one of the most consequential pictures in science. The
 * points do not fill the plane; they fall on a long diagonal with two
 * detached islands off it, and those regions turned out to be *stages*. The
 * diagonal is where a star spends almost its whole life burning hydrogen. The
 * island up and to the right is what happens when the hydrogen runs out and
 * the star swells. The island at the bottom is the naked core it leaves
 * behind. The chart is a life cycle drawn by accident, and it was read as one
 * within a few years.
 *
 * Worth being clear about what the chart contributed. Both axes were already
 * known, star by star, in tables. The classification into giants and dwarfs
 * existed as a suspicion. What no table shows is *empty space*, and the
 * regions of this plane that nothing occupies are the finding: a gap in a
 * table is invisible, and a gap in a scatter is the first thing you see.
 *
 * The two axes both run backwards from what a modern reader expects, and both
 * conventions are Russell's. Temperature increases to the *left*, because he
 * ordered stars by the spectral classes O B A F G K M that were already in
 * use, and luminosity is drawn on a log scale spanning ten orders of
 * magnitude, because nothing else fits.
 *
 * ── On the numbers ─────────────────────────────────────────────────────────
 *
 * The labelled stars are real, with their published effective temperatures and
 * bolometric luminosities. The background population is simulated from the
 * standard mass-luminosity and evolutionary relations rather than taken from a
 * catalogue: the structure and the proportions are right, the individual dots
 * are not particular stars, and the caption says so.
 */
import { Plot, plot, HALO, MUTED, SERIES, rng } from "./_theme.mjs";

export const title =
  "A Hertzsprung-Russell diagram: surface temperature on a reversed horizontal axis against luminosity on a logarithmic vertical axis. Most stars fall on a long diagonal band, the main sequence, with a separate clump of cool bright giants above it and a scatter of hot faint white dwarfs below.";

/** Real stars, with effective temperature in kelvin and luminosity in solar
 *  units. Placed by name so a reader has somewhere to stand. */
const NAMED = [
  { name: "Sun", teff: 5778, lum: 1, anchor: "start" },
  { name: "Sirius A", teff: 9940, lum: 25.4, anchor: "start" },
  { name: "Sirius B", teff: 25_000, lum: 0.026, anchor: "end" },
  { name: "Proxima Centauri", teff: 3042, lum: 0.0017, anchor: "end" },
  { name: "Aldebaran", teff: 3910, lum: 439, anchor: "end" },
  { name: "Betelgeuse", teff: 3600, lum: 90_000, anchor: "end" },
  { name: "Rigel", teff: 12_100, lum: 120_000, anchor: "start" },
  { name: "Spica", teff: 22_400, lum: 12_100, anchor: "start" },
];

// ── The simulated background ────────────────────────────────────────────────
//
// One draw per population, each following the relation that defines it, so the
// bands sit where physics puts them rather than where they were typed.
const u = rng(20_250_911);
const jitter = (spread) => (u() - 0.5) * 2 * spread;

/** Main sequence: log L rises roughly linearly with log T across the range,
 *  and the initial mass function makes cool dwarfs overwhelmingly common. */
const MAIN = Array.from({ length: 1000 }, () => {
  // Weighted towards the cool end, because small stars really are that much
  // more common, but not so hard that the whole sequence lands in one blob
  // against the right-hand edge.
  const t = Math.pow(u(), 1.7);
  const logT = 3.47 + t * (4.58 - 3.47);
  const logL = -2.9 + (logT - 3.47) * 7.1 + jitter(0.24);
  return { teff: 10 ** logT, lum: 10 ** logL, group: "Main sequence" };
});

/** Giants: cool and bright, in a clump well off the sequence. */
const GIANTS = Array.from({ length: 190 }, () => {
  const logT = 3.53 + u() * 0.18;
  const logL = 1.5 + u() * 1.6 + jitter(0.2);
  return { teff: 10 ** logT, lum: 10 ** logL, group: "Giants" };
});

/** Supergiants: a thin band across the top, at nearly any temperature. */
const SUPERGIANTS = Array.from({ length: 55 }, () => {
  const logT = 3.55 + u() * 0.85;
  const logL = 4.4 + u() * 1.3 + jitter(0.15);
  return { teff: 10 ** logT, lum: 10 ** logL, group: "Supergiants" };
});

/** White dwarfs: hot, tiny, and therefore very faint. */
const DWARFS = Array.from({ length: 150 }, () => {
  const logT = 3.75 + u() * 0.65;
  const logL = -3.6 + (logT - 3.75) * 2.2 + jitter(0.3);
  return { teff: 10 ** logT, lum: 10 ** logL, group: "White dwarfs" };
});

const COLOR = {
  "Main sequence": SERIES[0],
  Giants: SERIES[4],
  Supergiants: SERIES[1],
  "White dwarfs": SERIES[2],
};

const STARS = [...MAIN, ...GIANTS, ...SUPERGIANTS, ...DWARFS];

const REGIONS = [
  { label: "Supergiants", teff: 34_000, lum: 1.3e6, anchor: "start" },
  { label: "Giants", teff: 5200, lum: 3000, anchor: "end" },
  { label: "Main sequence", teff: 6300, lum: 0.3, anchor: "start" },
  { label: "White dwarfs", teff: 9800, lum: 4e-5, anchor: "start" },
];

export const caption = `Hertzsprung and Russell each plotted two quantities astronomers had been tabulating separately for years: how hot a star's surface is, and how much light it gives off. Nobody expected the points to do anything in particular. Instead they fall on one long diagonal with two detached islands, and those regions turned out to be stages of a single life story. The diagonal is where a star spends nearly all of its life; the clump above it is what happens when the hydrogen runs out and the star swells; the scatter at the bottom is the exposed core left behind. The finding is really the empty space, which is exactly what a table cannot show you: a gap between rows of numbers is invisible, and a gap in a scatter is the first thing you see. Both axes run backwards on purpose, temperature to the left because Russell kept the spectral ordering already in use, and luminosity on a log scale because the range is ten orders of magnitude. The named stars here are real and carry their published values; the background population is simulated from the standard relations, so its shape is right and its dots are not individual stars.`;

export function render() {
  return plot({
    height: 400,
    marginTop: 24,
    marginLeft: 66,
    marginRight: 24,
    marginBottom: 52,
    ariaLabel: title,
    x: {
      label: "Surface temperature (K), hotter to the left",
      labelAnchor: "center",
      type: "log",
      reverse: true,
      domain: [2600, 46_000],
      ticks: [3000, 5000, 10_000, 20_000, 40_000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: {
      label: "Luminosity (Sun = 1)",
      type: "log",
      domain: [1e-5, 3e6],
      ticks: [1e-4, 1e-2, 1, 1e2, 1e4, 1e6],
      tickFormat: (d) => (d === 1 ? "1" : `10${supers(Math.round(Math.log10(d)))}`),
    },
    marks: [
      Plot.dot(STARS, {
        x: "teff",
        y: "lum",
        r: 1.7,
        fill: (d) => COLOR[d.group],
        fillOpacity: 0.5,
        clip: true,
      }),
      ...["start", "end"].map((anchor) =>
        Plot.text(
          REGIONS.filter((d) => d.anchor === anchor),
          {
            x: "teff",
            y: "lum",
            text: "label",
            fill: (d) => COLOR[d.label],
            fontSize: 12,
            fontWeight: 700,
            textAnchor: anchor,
            ...HALO,
          },
        ),
      ),
      Plot.dot(NAMED, {
        x: "teff",
        y: "lum",
        r: 4,
        fill: "var(--ds-chart-surface)",
        stroke: MUTED,
        strokeWidth: 1.6,
      }),
      ...["start", "end"].map((anchor) =>
        Plot.text(
          NAMED.filter((d) => d.anchor === anchor),
          {
            x: "teff",
            y: "lum",
            text: "name",
            fill: MUTED,
            fontSize: 10.5,
            fontWeight: 600,
            textAnchor: anchor,
            dx: anchor === "start" ? 8 : -8,
            ...HALO,
          },
        ),
      ),
    ],
  });
}

/** Superscript digits, so a log tick reads 10⁻⁴ rather than 1e-4. */
function supers(n) {
  const GLYPHS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const digits = String(Math.abs(n))
    .split("")
    .map((d) => GLYPHS[Number(d)])
    .join("");
  return (n < 0 ? "⁻" : "") + digits;
}
